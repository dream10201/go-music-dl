package web

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/guohuiyuan/go-music-dl/core"
)

type aiEndpoint struct {
	Group       string            `json:"group"`
	Method      string            `json:"method"`
	Path        string            `json:"path"`
	Description string            `json:"description"`
	Params      map[string]string `json:"params,omitempty"`
	Body        map[string]string `json:"body,omitempty"`
	Returns     string            `json:"returns"`
	Write       bool              `json:"write,omitempty"`
	Auth        string            `json:"auth,omitempty"`
}

// RegisterAIRoutes exposes an AI discovery index. Every operation referenced
// by the index is an existing go-music-dl route, so search, source switching,
// downloads, and library handling have one implementation and one set of
// behavior.
func RegisterAIRoutes(api *gin.RouterGroup) {
	basePath := strings.TrimRight(api.BasePath(), "/")
	indexPath := basePath + "/api/ai/index"

	api.GET("/api/ai/index", func(c *gin.Context) {
		c.Header("Cache-Control", "public, max-age=300")
		c.JSON(http.StatusOK, gin.H{
			"name":           "go-music-dl",
			"schema_version": 2,
			"description":    "AI capability index. All operations reuse the existing go-music-dl routes listed below.",
			"base_path":      basePath,
			"index":          indexPath,
			"search":         basePath + "/search",
			"switch_source":  basePath + "/switch_source",
			"llms_txt":       basePath + "/llms.txt",
			"auth":           "write routes require the same-origin write header; personalized existing sources may use configured platform cookies",
			"token_guidance": "Use the existing search/playlist/album/toplist/source-switch routes to find resources, then the download queue routes to save them.",
			"sources": gin.H{
				"song":              core.GetAllSourceNames(),
				"playlist":          core.GetPlaylistSourceNames(),
				"album":             core.GetAlbumSourceNames(),
				"toplist":           core.GetTopListSourceNames(),
				"playlist_category": core.GetPlaylistCategorySourceNames(),
				"recommend":         core.GetRecommendSourceNames(),
				"user_playlist":     core.GetUserPlaylistSourceNames(),
			},
			"endpoints": aiEndpointCatalog(basePath),
		})
	})

	api.GET("/llms.txt", func(c *gin.Context) {
		c.Header("Cache-Control", "public, max-age=300")
		c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(aiLLMSText(basePath)))
	})
}

func indexPath(basePath string) string {
	return basePath + "/api/ai/index"
}

func aiEndpointCatalog(basePath string) []aiEndpoint {
	writeAuth := "X-Requested-With: XMLHttpRequest"
	return []aiEndpoint{
		{
			Group:       "discover",
			Method:      http.MethodGet,
			Path:        basePath + "/search",
			Description: "Existing aggregated search for songs, playlists, or albums. Returns the regular rendered page.",
			Params: map[string]string{
				"q":            "required search text or a supported platform URL",
				"type":         "song (default), playlist, or album",
				"sources":      "optional repeated query parameter, for example sources=qq&sources=netease",
				"exact_artist": "optional exact artist filter for songs",
			},
			Returns: "html",
		},
		{
			Group:       "discover",
			Method:      http.MethodGet,
			Path:        basePath + "/recommend",
			Description: "Existing recommended playlist page.",
			Params:      map[string]string{"sources": "optional repeated source names"},
			Returns:     "html",
		},
		{
			Group:       "discover",
			Method:      http.MethodGet,
			Path:        basePath + "/user_playlists",
			Description: "Existing playlists created or collected by the configured platform accounts.",
			Params:      map[string]string{"sources": "optional repeated source names"},
			Returns:     "html",
		},
		{
			Group:       "discover",
			Method:      http.MethodGet,
			Path:        basePath + "/playlist_categories",
			Description: "Existing playlist category discovery page.",
			Params:      map[string]string{"sources": "optional repeated source names"},
			Returns:     "html",
		},
		{
			Group:       "discover",
			Method:      http.MethodGet,
			Path:        basePath + "/category_playlists",
			Description: "Existing playlists inside one source category.",
			Params: map[string]string{
				"source":        "required",
				"category_id":   "required; an empty value requests all categories where supported",
				"category_name": "optional display name",
			},
			Returns: "html",
		},
		{
			Group:       "discover",
			Method:      http.MethodGet,
			Path:        basePath + "/toplists",
			Description: "Existing rankings and chart-like playlist page.",
			Params:      map[string]string{"sources": "optional repeated source names"},
			Returns:     "html",
		},
		{
			Group:       "discover",
			Method:      http.MethodGet,
			Path:        basePath + "/toplist_songs",
			Description: "Existing ranked songs page for one chart.",
			Params: map[string]string{
				"source":           "required",
				"toplist_id":       "required",
				"toplist_name":     "optional display name",
				"update_frequency": "optional display metadata",
				"link":             "optional original link",
			},
			Returns: "html",
		},
		{
			Group:       "details",
			Method:      http.MethodGet,
			Path:        basePath + "/playlist",
			Description: "Existing platform playlist detail page.",
			Params: map[string]string{
				"id":     "required playlist id",
				"source": "required",
				"link":   "optional original link",
			},
			Returns: "html",
		},
		{
			Group:       "details",
			Method:      http.MethodGet,
			Path:        basePath + "/album",
			Description: "Existing album detail page.",
			Params: map[string]string{
				"id":     "required album id",
				"source": "required",
			},
			Returns: "html",
		},
		{
			Group:       "resource",
			Method:      http.MethodGet,
			Path:        basePath + "/inspect",
			Description: "Existing source-resolution check. A valid result may set preview_only=true for preview-only samples.",
			Params: map[string]string{
				"id":       "required",
				"source":   "required",
				"duration": "optional seconds",
				"extra":    "optional URL-encoded JSON object",
			},
			Returns: "json",
		},
		{
			Group:       "resource",
			Method:      http.MethodGet,
			Path:        basePath + "/switch_source",
			Description: "Existing automatic source switch. Use this route instead of a duplicate AI endpoint.",
			Params: map[string]string{
				"name":     "required",
				"artist":   "optional",
				"source":   "optional current source",
				"target":   "optional target source",
				"duration": "optional seconds",
			},
			Returns: "json",
		},
		{
			Group:       "download",
			Method:      http.MethodGet,
			Path:        basePath + "/download",
			Description: "Existing audio download route.",
			Params: map[string]string{
				"id":     "required",
				"source": "required",
				"name":   "recommended",
				"artist": "recommended",
				"album":  "optional",
				"cover":  "optional",
				"extra":  "optional URL-encoded JSON object",
				"embed":  "optional 1 when saving a file",
			},
			Returns: "audio file",
		},
		{
			Group:       "resource",
			Method:      http.MethodGet,
			Path:        basePath + "/lyric",
			Description: "Existing lyrics route.",
			Params: map[string]string{
				"id":     "required",
				"source": "required",
				"name":   "recommended",
				"artist": "recommended",
				"extra":  "optional URL-encoded JSON object",
				"format": "auto, lrc, or plain",
			},
			Returns: "text",
		},
		{
			Group:       "resource",
			Method:      http.MethodGet,
			Path:        basePath + "/download_lrc",
			Description: "Existing standard LRC download route.",
			Params: map[string]string{
				"id":     "required",
				"source": "required",
				"name":   "recommended",
				"artist": "recommended",
				"extra":  "optional URL-encoded JSON object",
			},
			Returns: "text file",
		},
		{
			Group:       "resource",
			Method:      http.MethodGet,
			Path:        basePath + "/cover_proxy",
			Description: "Existing source-aware remote cover proxy.",
			Params: map[string]string{
				"url":    "required",
				"source": "optional source name",
			},
			Returns: "image",
		},
		{
			Group:       "downloads",
			Method:      http.MethodGet,
			Path:        basePath + "/api/downloads/records",
			Description: "Existing download history.",
			Params: map[string]string{
				"page":      "optional, default 1",
				"page_size": "1-100, default 20",
			},
			Returns: "json",
		},
		{
			Group:       "downloads",
			Method:      http.MethodPost,
			Path:        basePath + "/api/downloads/precheck",
			Description: "Existing read-only check for songs that are already downloaded.",
			Body:        map[string]string{"songs": "array of {name,artist}; maximum 20000"},
			Returns:     "json",
		},
		{
			Group:       "downloads",
			Method:      http.MethodGet,
			Path:        basePath + "/api/downloads/queue",
			Description: "Existing persistent download queue.",
			Params: map[string]string{
				"page":   "optional, default 1",
				"status": "waiting, downloading, success, failed, skipped, canceled, or active",
			},
			Returns: "json",
		},
		{
			Group:       "downloads",
			Method:      http.MethodPost,
			Path:        basePath + "/api/downloads/queue",
			Description: "Existing route to enqueue up to 2000 explicit songs.",
			Body: map[string]string{
				"request_id": "required unique request id",
				"songs":      "array of {id,source,name,artist,album,cover,extra,embed}; extra is a JSON-encoded string",
			},
			Returns: "json",
			Write:   true,
			Auth:    writeAuth,
		},
		{
			Group:       "downloads",
			Method:      http.MethodPost,
			Path:        basePath + "/api/downloads/queue/container",
			Description: "Existing route to enqueue a complete playlist, album, toplist, or collection.",
			Body: map[string]string{
				"request_id": "required unique request id",
				"kind":       "playlist, album, or collection",
				"id":         "required container id",
				"source":     "required for platform containers",
				"link":       "optional original link",
				"embed":      "optional boolean",
			},
			Returns: "json",
			Write:   true,
			Auth:    writeAuth,
		},
		{
			Group:       "downloads",
			Method:      http.MethodPost,
			Path:        basePath + "/api/downloads/queue/{id}/{action}",
			Description: "Existing route to retry or cancel one queue task.",
			Params:      map[string]string{"id": "required task id", "action": "retry or cancel"},
			Returns:     "json",
			Write:       true,
			Auth:        writeAuth,
		},
		{
			Group:       "downloads",
			Method:      http.MethodDelete,
			Path:        basePath + "/api/downloads/queue/{id}",
			Description: "Existing route to remove one inactive queue task.",
			Params:      map[string]string{"id": "required task id"},
			Returns:     "json",
			Write:       true,
			Auth:        writeAuth,
		},
		{
			Group:       "downloads",
			Method:      http.MethodDelete,
			Path:        basePath + "/api/downloads/queue",
			Description: "Existing route to clear inactive queue tasks. Use only on explicit user request.",
			Returns:     "json",
			Write:       true,
			Auth:        writeAuth,
		},
		{
			Group:       "library",
			Method:      http.MethodGet,
			Path:        basePath + "/local_music",
			Description: "Existing paginated local music index.",
			Params: map[string]string{
				"offset":        "optional, default 0",
				"limit":         "optional page size",
				"refresh":       "use 1 to rescan",
				"force":         "use 1 to rescan",
				"collection_id": "optional imported collection id",
			},
			Returns: "json",
		},
		{
			Group:       "library",
			Method:      http.MethodGet,
			Path:        basePath + "/collections",
			Description: "Existing local collection list.",
			Params:      map[string]string{"include_imported": "optional 0 or 1"},
			Returns:     "json",
		},
		{
			Group:       "library",
			Method:      http.MethodGet,
			Path:        basePath + "/collections/{id}/songs",
			Description: "Existing local collection song list.",
			Params:      map[string]string{"id": "required collection id"},
			Returns:     "json",
		},
		{
			Group:       "system",
			Method:      http.MethodGet,
			Path:        basePath + "/healthz",
			Description: "Existing service health check.",
			Returns:     "json",
		},
		{
			Group:       "system",
			Method:      http.MethodGet,
			Path:        indexPath(basePath),
			Description: "This machine-readable capability index.",
			Returns:     "json",
		},
		{
			Group:       "system",
			Method:      http.MethodGet,
			Path:        basePath + "/llms.txt",
			Description: "Short operational guide for language models.",
			Returns:     "text",
		},
	}
}

func aiLLMSText(basePath string) string {
	return fmt.Sprintf(`# go-music-dl AI API

Every operation uses the existing go-music-dl route; there are no parallel AI search, playlist, source-switch, download, or library routes.

Start:
- GET %[1]s/api/ai/index
- GET %[1]s/search?q=周杰伦&type=song&sources=qq&sources=netease

Discover:
- Rankings: GET %[1]s/toplists
- Ranked songs: GET %[1]s/toplist_songs?source=...&toplist_id=...
- Playlist categories: GET %[1]s/playlist_categories
- Category playlists: GET %[1]s/category_playlists?source=...&category_id=...
- Recommendations: GET %[1]s/recommend
- Account playlists: GET %[1]s/user_playlists

Details:
- Playlist: GET %[1]s/playlist?id=...&source=...
- Album: GET %[1]s/album?id=...&source=...

Downloads:
- Source switch: GET %[1]s/switch_source?name=...&artist=...&source=...&target=...
- Resolution check: GET %[1]s/inspect
- Audio file: GET %[1]s/download?...
- Lyrics: GET %[1]s/lyric
- Queue status: GET %[1]s/api/downloads/queue
- Enqueue songs: POST %[1]s/api/downloads/queue
- Enqueue a complete container: POST %[1]s/api/downloads/queue/container

Library and health:
- Local music: GET %[1]s/local_music?offset=0&limit=50
- Local collections: GET %[1]s/collections
- Collection songs: GET %[1]s/collections/{id}/songs
- Health: GET %[1]s/healthz

Rules:
- {base} defaults to /music. The runtime index is the source of truth.
- Existing search, playlist, album, ranking, recommendation, and category routes return the normal rendered page.
- Preserve a song's extra object because some sources require it for downloads or lyrics.
- Writes must send X-Requested-With: XMLHttpRequest.
- Never expose cookies, login, or configuration routes to an AI client.
`, basePath)
}
