package web

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"

	"github.com/guohuiyuan/go-music-dl/lib/model"
)

func TestSearchDownloadRejectsInvalidRequest(t *testing.T) {
	r, _ := setupContainerTests(t)
	w := containerRequest(r, "/api/downloads/queue/search", map[string]any{"type": "song", "dry_run": true})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", w.Code)
	}
	w = containerRequest(r, "/api/downloads/queue/search", map[string]any{"q": "x", "type": "song"})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("missing request_id status = %d, want 400", w.Code)
	}
}

func TestSearchDownloadDryRunThenEnqueueUsesCachedResult(t *testing.T) {
	r, q := setupContainerTests(t)
	songs := make([]model.Song, 0, 2500)
	for i := 0; i < 2500; i++ {
		songs = append(songs, model.Song{ID: "id" + strconv.Itoa(i), Source: "migu", Name: "song"})
	}
	songs = append(songs, model.Song{Source: "migu"})
	token := cacheSearchDownloadResult(searchResult{SearchType: "song", Songs: songs})

	w := containerRequest(r, "/api/downloads/queue/search", map[string]any{"q": "test", "type": "song", "dry_run": true, "token": token})
	if w.Code != http.StatusOK {
		t.Fatalf("dry run status = %d body=%s", w.Code, w.Body.String())
	}
	var preview struct {
		Token          string `json:"token"`
		Songs          int    `json:"songs"`
		SkippedInvalid int    `json:"skipped_invalid"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &preview)
	if preview.Songs != 2500 || preview.SkippedInvalid != 1 || preview.Token == "" {
		t.Fatalf("unexpected preview: %+v", preview)
	}
	if _, ok := takeSearchDownloadResult(token); ok {
		t.Fatal("dry run should consume the original token")
	}

	w = containerRequest(r, "/api/downloads/queue/search", map[string]any{"q": "test", "type": "song", "token": preview.Token, "request_id": "req-1"})
	if w.Code != http.StatusAccepted {
		t.Fatalf("enqueue status = %d body=%s", w.Code, w.Body.String())
	}
	var result struct {
		Added int `json:"added"`
		Total int `json:"total"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &result)
	if result.Added != 2500 || result.Total != 2501 {
		t.Fatalf("unexpected result: %+v", result)
	}
	_, total, _, err := q.List(1, 50, "")
	if err != nil || total != 2500 {
		t.Fatalf("queue total = %d err=%v, want 2500", total, err)
	}
}

func TestContainerDownloadRequestKinds(t *testing.T) {
	cases := []struct {
		searchType string
		playlist   model.Playlist
		want       string
	}{
		{"album", model.Playlist{Source: "migu", ID: "1"}, collectionContentAlbum},
		{"playlist", model.Playlist{Source: "migu", ID: "1"}, collectionContentPlaylist},
	}
	for _, tc := range cases {
		if got := containerDownloadRequest(tc.searchType, tc.playlist).Kind; got != tc.want {
			t.Errorf("%s/%s kind = %q, want %q", tc.searchType, tc.playlist.Source, got, tc.want)
		}
	}
}
