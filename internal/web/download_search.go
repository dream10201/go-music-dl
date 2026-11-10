package web

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/guohuiyuan/go-music-dl/core"
	"github.com/guohuiyuan/go-music-dl/lib/model"
)

type searchDownloadRequest struct {
	RequestID   string   `json:"request_id"`
	Query       string   `json:"q"`
	Type        string   `json:"type"`
	Sources     []string `json:"sources"`
	ExactArtist string   `json:"exact_artist"`
	Embed       bool     `json:"embed"`
	DryRun      bool     `json:"dry_run"`
	Token       string   `json:"token"`
}

const (
	searchDownloadCacheTTL   = 10 * time.Minute
	searchDownloadMaxSongs   = 20000
	searchDownloadConcurrent = 4
	maxFailedContainerLabels = 5
)

type searchDownloadCacheEntry struct {
	result  searchResult
	expires time.Time
}

var searchDownloadCache = struct {
	sync.Mutex
	entries map[string]searchDownloadCacheEntry
}{entries: map[string]searchDownloadCacheEntry{}}

func cacheSearchDownloadResult(result searchResult) string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return ""
	}
	token := hex.EncodeToString(buf)
	now := time.Now()
	searchDownloadCache.Lock()
	defer searchDownloadCache.Unlock()
	for key, entry := range searchDownloadCache.entries {
		if now.After(entry.expires) {
			delete(searchDownloadCache.entries, key)
		}
	}
	searchDownloadCache.entries[token] = searchDownloadCacheEntry{result: result, expires: now.Add(searchDownloadCacheTTL)}
	return token
}

func takeSearchDownloadResult(token string) (searchResult, bool) {
	if token == "" {
		return searchResult{}, false
	}
	searchDownloadCache.Lock()
	defer searchDownloadCache.Unlock()
	entry, ok := searchDownloadCache.entries[token]
	if !ok {
		return searchResult{}, false
	}
	delete(searchDownloadCache.entries, token)
	if time.Now().After(entry.expires) {
		return searchResult{}, false
	}
	return entry.result, true
}

func containerDownloadRequest(searchType string, playlist model.Playlist) downloadContainerRequest {
	kind := collectionContentPlaylist
	if searchType == collectionContentAlbum {
		kind = collectionContentAlbum
	}
	return downloadContainerRequest{Kind: kind, ID: playlist.ID, Source: playlist.Source, Link: playlist.Link}
}

// collectSearchContainerSongs 并发拉取搜索命中的每个歌单/专辑的完整曲目，返回去重后的歌曲与失败的容器名。
func collectSearchContainerSongs(searchType string, playlists []model.Playlist) ([]model.Song, []string, int) {
	results := make([][]model.Song, len(playlists))
	failed := make([]bool, len(playlists))
	sem := make(chan struct{}, searchDownloadConcurrent)
	var wg sync.WaitGroup
	for i, playlist := range playlists {
		wg.Add(1)
		go func(i int, playlist model.Playlist) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			songs, err := loadDownloadContainerSongs(containerDownloadRequest(searchType, playlist))
			if err != nil {
				failed[i] = true
				return
			}
			results[i] = songs
		}(i, playlist)
	}
	wg.Wait()

	seen := make(map[string]struct{})
	var songs []model.Song
	failedLabels := make([]string, 0, maxFailedContainerLabels)
	failedCount := 0
	for i := range playlists {
		if failed[i] {
			failedCount++
			if len(failedLabels) < maxFailedContainerLabels {
				failedLabels = append(failedLabels, strings.TrimSpace(playlists[i].Name))
			}
			continue
		}
		for _, song := range results[i] {
			key := strings.TrimSpace(song.Source) + "|" + strings.TrimSpace(song.ID)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			songs = append(songs, song)
		}
	}
	return songs, failedLabels, failedCount
}

func splitDownloadableSongs(songs []model.Song) (downloadable []model.Song, invalid int) {
	for _, song := range songs {
		if strings.TrimSpace(song.ID) == "" || strings.TrimSpace(song.Source) == "" {
			invalid++
			continue
		}
		downloadable = append(downloadable, song)
	}
	return downloadable, invalid
}

func registerSearchDownloadRoute(api *gin.RouterGroup, queue *core.DownloadQueue) {
	api.POST("/api/downloads/queue/search", func(c *gin.Context) {
		if !allowSameOriginWrite(c) {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 64<<10)
		var req searchDownloadRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "无效的下载请求"})
			return
		}
		req.Query = strings.TrimSpace(req.Query)
		req.RequestID = strings.TrimSpace(req.RequestID)
		if req.Query == "" || (!req.DryRun && (req.RequestID == "" || len(req.RequestID) > 128)) {
			c.JSON(400, gin.H{"error": "无效的下载请求"})
			return
		}
		switch req.Type {
		case "song", collectionContentPlaylist, collectionContentAlbum:
		default:
			req.Type = "song"
		}
		if len(req.Sources) == 0 {
			req.Sources = defaultSourcesForSearchType(req.Type)
		}

		result, ok := takeSearchDownloadResult(req.Token)
		if !ok {
			result = runSearch(c, req.Query, req.Type, strings.TrimSpace(req.ExactArtist), req.Sources)
		}
		if len(result.Songs) == 0 && len(result.Playlists) == 0 {
			message := "搜索没有可下载的结果"
			if result.ErrorMsg != "" {
				message += "：" + result.ErrorMsg
			}
			c.JSON(400, gin.H{"error": message})
			return
		}

		if req.DryRun {
			payload := gin.H{"token": cacheSearchDownloadResult(result), "type": result.SearchType}
			if result.SearchType == "song" {
				kept := filterSongsForDisplay(result.Songs, core.GetWebSettings())
				downloadable, invalid := splitDownloadableSongs(kept)
				payload["songs"] = len(downloadable)
				payload["skipped_filtered"] = len(result.Songs) - len(kept)
				payload["skipped_invalid"] = invalid
			} else {
				tracks := 0
				for _, playlist := range result.Playlists {
					tracks += playlist.TrackCount
				}
				payload["containers"] = len(result.Playlists)
				payload["tracks"] = tracks
			}
			c.JSON(200, payload)
			return
		}

		var songs []model.Song
		var failedLabels []string
		failedCount := 0
		containers := 0
		if result.SearchType == "song" {
			songs = result.Songs
		} else {
			containers = len(result.Playlists)
			songs, failedLabels, failedCount = collectSearchContainerSongs(result.SearchType, result.Playlists)
		}
		settings := core.GetWebSettings()
		fetched := len(songs)
		songs = filterSongsForDisplay(songs, settings)
		downloadable, invalid := splitDownloadableSongs(songs)
		if len(downloadable) == 0 {
			c.JSON(400, gin.H{"error": "没有可加入下载队列的歌曲", "failed_containers": failedCount})
			return
		}
		if len(downloadable) > searchDownloadMaxSongs {
			c.JSON(400, gin.H{"error": fmt.Sprintf("歌曲超过 %d 首，请缩小搜索范围后再下载；本次未加入队列", searchDownloadMaxSongs)})
			return
		}
		inputs := make([]core.DownloadTaskInput, 0, len(downloadable))
		for _, song := range downloadable {
			inputs = append(inputs, core.DownloadTaskInput{Song: song, Directory: core.DownloadDirOrDefault(settings.DownloadDir), FilenameTemplate: settings.DownloadFilenameTemplate, Embed: req.Embed})
		}
		added, err := queue.Enqueue(req.RequestID, inputs)
		if err != nil {
			c.JSON(500, gin.H{"error": "加入队列失败：" + err.Error()})
			return
		}
		c.JSON(http.StatusAccepted, gin.H{
			"type":              result.SearchType,
			"added":             added,
			"existing":          len(inputs) - added,
			"total":             fetched,
			"skipped_filtered":  fetched - len(songs),
			"containers":        containers,
			"failed_containers": failedCount,
			"failed_labels":     failedLabels,
			"skipped_invalid":   invalid,
		})
	})
}
