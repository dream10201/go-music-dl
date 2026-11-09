package web

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/guohuiyuan/go-music-dl/core"
	"github.com/guohuiyuan/music-lib/model"
)

func TestDownloadQueueAPIPersistsAppendAndRejectsCrossOrigin(t *testing.T) {
	if err := core.CloseConfigDB(); err != nil {
		t.Fatal(err)
	}
	t.Setenv("MUSIC_DL_CONFIG_DB", filepath.Join(t.TempDir(), "settings.db"))
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
	RegisterDownloadQueueRoutes(r.Group("/music"), q)
	request := func(method, path string, body []byte, origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, "http://music.test/music/api/downloads/queue"+path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Requested-With", "XMLHttpRequest")
		req.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	payload := []byte(`{"request_id":"one","songs":[{"id":"1","source":"kuwo","name":"One"},{"id":"2","source":"kuwo","name":"Two"}]}`)
	if w := request("POST", "", payload, "http://other.test"); w.Code != 403 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w := request("POST", "", payload, "http://music.test"); w.Code != 202 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w := request("POST", "", payload, "http://music.test"); w.Code != 202 || !bytes.Contains(w.Body.Bytes(), []byte(`"added":0`)) {
		t.Fatal(w.Code, w.Body.String())
	}
	second := []byte(`{"request_id":"two","songs":[{"id":"3","source":"kuwo","name":"Three"}]}`)
	if w := request("POST", "", second, "http://music.test"); w.Code != 202 {
		t.Fatal(w.Code, w.Body.String())
	}
	if err := core.CloseConfigDB(); err != nil {
		t.Fatal(err)
	}
	q, err = core.OpenDownloadQueue()
	if err != nil {
		t.Fatal(err)
	}
	r = gin.New()
	RegisterDownloadQueueRoutes(r.Group("/music"), q)
	w := request("GET", "?status=active", nil, "http://music.test")
	var response struct {
		Total  int
		Tasks  []core.DownloadTask
		Counts map[string]int
	}
	if err = json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if w.Code != http.StatusOK || response.Total != 3 || len(response.Tasks) != 3 || response.Counts[core.TaskWaiting] != 3 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w := request("POST", "/1/cancel", nil, "http://music.test"); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w := request("POST", "/1/retry", nil, "http://music.test"); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	invalid := []byte(`{"request_id":"invalid","songs":[{"id":"4","source":"kuwo"},{"source":"kuwo"}]}`)
	if w := request("POST", "", invalid, "http://music.test"); w.Code != 400 {
		t.Fatal(w.Code, w.Body.String())
	}
	_, total, _, err := q.List(1, 50, "")
	if err != nil || total != 3 {
		t.Fatal(total, err)
	}
	if w := request("DELETE", "/1", nil, "https://other.example"); w.Code != 403 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w := request("DELETE", "", nil, "https://other.example"); w.Code != 403 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w := request("DELETE", "/invalid", nil, "http://music.test"); w.Code != 400 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w := request("DELETE", "/1", nil, "http://music.test"); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w := request("DELETE", "", nil, "http://music.test"); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	_, total, _, err = q.List(1, 50, "")
	if err != nil || total != 0 {
		t.Fatal(total, err)
	}

}

func TestRetryFailedRecordsEnqueuesFailedHistory(t *testing.T) {
	if err := core.CloseConfigDB(); err != nil {
		t.Fatal(err)
	}
	t.Setenv("MUSIC_DL_CONFIG_DB", filepath.Join(t.TempDir(), "settings.db"))
	t.Cleanup(func() { _ = core.CloseConfigDB() })
	q, err := core.OpenDownloadQueue()
	if err != nil {
		t.Fatal(err)
	}
	song := &model.Song{ID: "7", Source: "nosuch", Name: "Broken", Artist: "Artist"}
	if _, err := core.DownloadWithDedupCheckWithTemplate(song, t.TempDir(), true, true, "", nil); err == nil {
		t.Fatal("download with unsupported source should fail")
	}
	gin.SetMode(gin.TestMode)
	r := gin.New()
	RegisterDownloadQueueRoutes(r.Group("/music"), q)
	req := httptest.NewRequest("POST", "http://music.test/music/api/downloads/records/retry-failed", nil)
	req.Header.Set("X-Requested-With", "XMLHttpRequest")
	req.Header.Set("Origin", "http://music.test")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusAccepted || !bytes.Contains(w.Body.Bytes(), []byte(`"added":1`)) {
		t.Fatal(w.Code, w.Body.String())
	}
	tasks, _, _, err := q.List(1, 10, "")
	if err != nil || len(tasks) != 1 || tasks[0].Name != "Broken" || tasks[0].Status != core.TaskWaiting {
		t.Fatal(err, tasks)
	}
}

func TestDedupRoutesListAndForget(t *testing.T) {
	if err := core.CloseConfigDB(); err != nil {
		t.Fatal(err)
	}
	t.Setenv("MUSIC_DL_CONFIG_DB", filepath.Join(t.TempDir(), "settings.db"))
	t.Cleanup(func() { _ = core.CloseConfigDB() })
	q, err := core.OpenDownloadQueue()
	if err != nil {
		t.Fatal(err)
	}
	if err := core.SaveDownloadDedupEntry("Moved", "Artist", "Artist - Moved.mp3"); err != nil {
		t.Fatal(err)
	}
	gin.SetMode(gin.TestMode)
	r := gin.New()
	RegisterDownloadQueueRoutes(r.Group("/music"), q)
	do := func(method, path string, body []byte) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, "http://music.test/music/api/downloads/dedup"+path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Requested-With", "XMLHttpRequest")
		req.Header.Set("Origin", "http://music.test")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	w := do("GET", "?q=moved", nil)
	var listed struct {
		Items []core.DownloadDedupListItem
		Total int
	}
	if err := json.Unmarshal(w.Body.Bytes(), &listed); err != nil || w.Code != 200 || listed.Total != 1 || listed.Items[0].FileExists == nil || *listed.Items[0].FileExists {
		t.Fatal(w.Code, w.Body.String(), err)
	}
	body, _ := json.Marshal(map[string]any{"keys": []string{listed.Items[0].SongKey}})
	if w := do("DELETE", "", body); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w := do("GET", "", nil); !bytes.Contains(w.Body.Bytes(), []byte(`"total":0`)) {
		t.Fatal(w.Body.String())
	}
}
