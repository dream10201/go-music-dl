package web

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/guohuiyuan/go-music-dl/core"
	"github.com/guohuiyuan/go-music-dl/lib/model"
)

func initConfigDBForTest(t *testing.T) {
	t.Helper()
	t.Setenv("MUSIC_DL_CONFIG_DB", filepath.Join(t.TempDir(), "data", "settings.db"))
	_ = core.CloseConfigDB()
	t.Cleanup(func() { _ = core.CloseConfigDB() })
}

func setupContainerTests(t *testing.T) (*gin.Engine, *core.DownloadQueue) {
	t.Helper()
	initConfigDBForTest(t)
	t.Cleanup(func() {
		if err := core.CloseConfigDB(); err != nil {
			t.Error(err)
		}
	})
	q, err := core.OpenDownloadQueue()
	if err != nil {
		t.Fatal(err)
	}
	gin.SetMode(gin.TestMode)
	r := gin.New()
	RegisterDownloadQueueRoutes(r.Group(RoutePrefix), q)
	return r, q
}
func containerRequest(r *gin.Engine, path string, body interface{}) *httptest.ResponseRecorder {
	data, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, RoutePrefix+path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}
func TestDownloadWholePlaylistHasNoPageOr2000SongLimit(t *testing.T) {
	r, q := setupContainerTests(t)
	original := playlistDetailFuncProvider
	t.Cleanup(func() { playlistDetailFuncProvider = original })
	playlistDetailFuncProvider = func(source string) func(string) ([]model.Song, error) {
		return func(id string) ([]model.Song, error) {
			if source != "kuwo" || id != "large" {
				t.Fatalf("unexpected container %s %s", source, id)
			}
			songs := make([]model.Song, 2205)
			for i := range songs {
				songs[i] = model.Song{ID: fmt.Sprint(i), Name: fmt.Sprintf("Song %d", i)}
			}
			return songs, nil
		}
	}
	req := downloadContainerRequest{RequestID: "whole", Kind: "playlist", ID: "large", Source: "kuwo", Embed: true}
	w := containerRequest(r, "/api/downloads/queue/container", req)
	if w.Code != 202 {
		t.Fatal(w.Code, w.Body.String())
	}
	var result struct{ Added, Total int }
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Added != 2205 || result.Total != 2205 {
		t.Fatal(w.Body.String())
	}
	tasks, total, _, err := q.List(45, 50, "")
	if err != nil || total != 2205 || len(tasks) != 5 || tasks[4].Name != "Song 2204" || tasks[4].Source != "kuwo" {
		t.Fatal(total, tasks, err)
	}
	w = containerRequest(r, "/api/downloads/queue/container", req)
	if w.Code != 202 || !bytes.Contains(w.Body.Bytes(), []byte(`"added":0`)) {
		t.Fatal(w.Code, w.Body.String())
	}
}
func TestDownloadWholeAlbum(t *testing.T) {
	r, q := setupContainerTests(t)
	original := albumDetailFuncProvider
	t.Cleanup(func() { albumDetailFuncProvider = original })
	albumDetailFuncProvider = func(string) func(string) ([]model.Song, error) {
		return func(id string) ([]model.Song, error) {
			return []model.Song{{ID: id + "-1", Name: "Track 1", Album: "Album", Extra: map[string]string{"album_id": id}}, {ID: id + "-2", Name: "Track 2", Album: "Album"}}, nil
		}
	}
	w := containerRequest(r, "/api/downloads/queue/container", downloadContainerRequest{RequestID: "album", Kind: "album", ID: "album1", Source: "qq"})
	if w.Code != 202 {
		t.Fatal(w.Code, w.Body.String())
	}
	_, total, _, err := q.List(1, 50, "")
	if err != nil || total != 2 {
		t.Fatal(total, err)
	}
}
func TestDownloadContainerUpstreamErrorDoesNotEnqueuePartialResults(t *testing.T) {
	originalParser := parsePlaylistFuncProvider
	parsePlaylistFuncProvider = func(string) func(string) (*model.Playlist, []model.Song, error) { return nil }
	t.Cleanup(func() { parsePlaylistFuncProvider = originalParser })

	r, q := setupContainerTests(t)
	original := playlistDetailFuncProvider
	t.Cleanup(func() { playlistDetailFuncProvider = original })
	playlistDetailFuncProvider = func(string) func(string) ([]model.Song, error) {
		return func(string) ([]model.Song, error) {
			return []model.Song{{ID: "partial", Source: "kuwo"}}, errors.New("upstream error")
		}
	}
	w := containerRequest(r, "/api/downloads/queue/container", downloadContainerRequest{RequestID: "failed", Kind: "playlist", ID: "playlist", Source: "kuwo"})
	if w.Code != 400 {
		t.Fatal(w.Code, w.Body.String())
	}
	_, total, _, err := q.List(1, 50, "")
	if err != nil || total != 0 {
		t.Fatal(total, err)
	}
}

func TestDownloadContainerSkipsInvalidSongsAndEnqueuesValidSongs(t *testing.T) {
	r, q := setupContainerTests(t)
	original := playlistDetailFuncProvider
	t.Cleanup(func() { playlistDetailFuncProvider = original })
	playlistDetailFuncProvider = func(source string) func(string) ([]model.Song, error) {
		return func(id string) ([]model.Song, error) {
			if source != "qq" || id != "mixed-playlist" {
				t.Fatalf("unexpected container %s %s", source, id)
			}
			return []model.Song{
				{ID: "valid-1", Source: "qq", Name: "Valid One", Artist: "Artist One"},
				{ID: "", Source: "qq", Name: "Cloud One", Artist: "Cloud Artist"},
				{ID: "valid-2", Source: "qq", Name: "Valid Two"},
				{ID: "", Source: "qq", Name: "Cloud Two"},
			}, nil
		}
	}

	w := containerRequest(r, "/api/downloads/queue/container", downloadContainerRequest{
		RequestID: "mixed",
		Kind:      collectionContentPlaylist,
		ID:        "mixed-playlist",
		Source:    "qq",
	})
	if w.Code != http.StatusAccepted {
		t.Fatal(w.Code, w.Body.String())
	}
	var result struct {
		Added          int      `json:"added"`
		Total          int      `json:"total"`
		SkippedInvalid int      `json:"skipped_invalid"`
		SkippedSongs   []string `json:"skipped_songs"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Added != 2 || result.Total != 4 || result.SkippedInvalid != 2 {
		t.Fatalf("unexpected result: %+v", result)
	}
	if len(result.SkippedSongs) != 2 || result.SkippedSongs[0] != "Cloud One - Cloud Artist" || result.SkippedSongs[1] != "Cloud Two" {
		t.Fatalf("unexpected skipped songs: %#v", result.SkippedSongs)
	}
	tasks, total, _, err := q.List(1, 50, "")
	if err != nil || total != 2 || len(tasks) != 2 {
		t.Fatal(total, tasks, err)
	}
	for _, task := range tasks {
		if task.ID == 0 || task.Source != "qq" || task.Name == "" {
			t.Fatalf("invalid queued task: %#v", task)
		}
	}
}

func TestDownloadContainerRejectsPlaylistWhenAllSongsLackIDs(t *testing.T) {
	r, q := setupContainerTests(t)
	original := playlistDetailFuncProvider
	t.Cleanup(func() { playlistDetailFuncProvider = original })
	playlistDetailFuncProvider = func(string) func(string) ([]model.Song, error) {
		return func(string) ([]model.Song, error) {
			return []model.Song{
				{ID: "", Source: "qq", Name: "Cloud One"},
				{ID: "", Source: "qq", Name: "Cloud Two"},
			}, nil
		}
	}

	w := containerRequest(r, "/api/downloads/queue/container", downloadContainerRequest{
		RequestID: "all-invalid",
		Kind:      collectionContentPlaylist,
		ID:        "all-invalid-playlist",
		Source:    "qq",
	})
	if w.Code != http.StatusBadRequest {
		t.Fatal(w.Code, w.Body.String())
	}
	if !bytes.Contains(w.Body.Bytes(), []byte(`"skipped_invalid":2`)) || !bytes.Contains(w.Body.Bytes(), []byte("Cloud One")) {
		t.Fatal(w.Body.String())
	}
	_, total, _, err := q.List(1, 50, "")
	if err != nil || total != 0 {
		t.Fatal(total, err)
	}
}

func TestDownloadWholeCollectionUIReportsSkippedInvalidSongs(t *testing.T) {
	content, err := templateFS.ReadFile("templates/static/js/app.js")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"data.skipped_invalid",
		"data.skipped_songs",
		"已加入下载队列（部分跳过）",
		"跳过缺少歌曲 ID 或音源",
	} {
		if !bytes.Contains(content, []byte(want)) {
			t.Fatalf("app.js missing %q", want)
		}
	}
}

func TestWholeDownloadButtonsRenderOnCardsAndDetail(t *testing.T) {
	for _, kind := range []string{"playlist", "album"} {
		t.Run(kind, func(t *testing.T) {
			r, _ := setupContainerTests(t)
			r.SetHTMLTemplate(newTestTemplate(t))
			r.GET("/test-card", func(c *gin.Context) {
				renderIndex(c, nil, []model.Playlist{{ID: "remote1", Source: "kuwo", Name: "Container", TrackCount: 125}}, "", []string{"kuwo"}, "", kind, "", nil)
			})
			r.GET("/test-detail", func(c *gin.Context) {
				renderIndex(c, []model.Song{{ID: "s1", Source: "kuwo", Name: "Song"}}, nil, "", []string{"kuwo"}, "", kind, "", &importCollectionMeta{Enabled: true, ContentType: kind, ExternalID: "remote1", Source: "kuwo"})
			})
			for _, path := range []string{"/test-card", "/test-detail"} {
				w := httptest.NewRecorder()
				r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
				if w.Code != 200 || !bytes.Contains(w.Body.Bytes(), []byte(`data-container-kind="`+kind+`"`)) || !bytes.Contains(w.Body.Bytes(), []byte(`data-container-id="remote1"`)) {
					t.Fatal(path, w.Code, w.Body.String())
				}
			}
		})
	}
}
