package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sort"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func newAIRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterAIRoutes(router.Group("/music"))
	return router
}

func TestAIIndexUsesExistingRoutes(t *testing.T) {
	router := newAIRouter()
	request := httptest.NewRequest(http.MethodGet, "/music/api/ai/index", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatal(response.Code, response.Body.String())
	}
	var payload struct {
		Name          string `json:"name"`
		SchemaVersion int    `json:"schema_version"`
		Search        string `json:"search"`
		SwitchSource  string `json:"switch_source"`
		LLMSTxt       string `json:"llms_txt"`
		Endpoints     []struct {
			Method string `json:"method"`
			Path   string `json:"path"`
			Write  bool   `json:"write"`
			Auth   string `json:"auth"`
		} `json:"endpoints"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Name != "go-music-dl" || payload.SchemaVersion != 2 ||
		payload.Search != "/music/search" ||
		payload.SwitchSource != "/music/switch_source" ||
		payload.LLMSTxt != "/music/llms.txt" {
		t.Fatalf("unexpected index: %+v", payload)
	}

	wantRoutes := []string{
		"GET /music/search",
		"GET /music/playlist",
		"GET /music/album",
		"GET /music/toplists",
		"GET /music/toplist_songs",
		"GET /music/playlist_categories",
		"GET /music/category_playlists",
		"GET /music/recommend",
		"GET /music/user_playlists",
		"GET /music/switch_source",
		"GET /music/inspect",
		"GET /music/download",
		"GET /music/lyric",
		"GET /music/local_music",
		"GET /music/collections",
		"GET /music/collections/{id}/songs",
		"GET /music/api/downloads/queue",
		"POST /music/api/downloads/queue",
		"POST /music/api/downloads/queue/container",
	}
	routes := make(map[string]struct{}, len(payload.Endpoints))
	paths := make(map[string]struct{}, len(payload.Endpoints))
	var queueWriteAuth string
	for _, endpoint := range payload.Endpoints {
		key := endpoint.Method + " " + endpoint.Path
		routes[key] = struct{}{}
		paths[endpoint.Path] = struct{}{}
		if strings.HasPrefix(endpoint.Path, "/music/api/ai/") &&
			endpoint.Path != "/music/api/ai/index" {
			t.Fatalf("index advertises AI wrapper %q", endpoint.Path)
		}
		if key == "POST /music/api/downloads/queue" && endpoint.Write {
			queueWriteAuth = endpoint.Auth
		}
	}
	for _, want := range wantRoutes {
		if _, ok := routes[want]; !ok {
			t.Fatalf("index missing existing route %q", want)
		}
	}
	if queueWriteAuth != "X-Requested-With: XMLHttpRequest" {
		t.Fatalf("queue write auth = %q", queueWriteAuth)
	}

	for _, removed := range []string{
		"/music/api/ai/search",
		"/music/api/ai/playlist",
		"/music/api/ai/album",
		"/music/api/ai/toplists",
		"/music/api/ai/toplist",
		"/music/api/ai/playlist-categories",
		"/music/api/ai/category-playlists",
		"/music/api/ai/recommend",
		"/music/api/ai/user-playlists",
		"/music/api/ai/local-music",
	} {
		if _, ok := paths[removed]; ok {
			t.Fatalf("index still advertises duplicate AI wrapper %q", removed)
		}
	}
}

func TestAIRegistersNoDuplicateResourceRoutes(t *testing.T) {
	router := newAIRouter()
	got := make([]string, 0, len(router.Routes()))
	for _, route := range router.Routes() {
		got = append(got, route.Method+" "+route.Path)
	}
	sort.Strings(got)
	want := []string{
		"GET /music/api/ai/index",
		"GET /music/llms.txt",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("registered AI routes = %v, want %v", got, want)
	}
}

func TestAILLMSTextPointsToExistingRoutes(t *testing.T) {
	router := newAIRouter()
	request := httptest.NewRequest(http.MethodGet, "/music/llms.txt", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatal(response.Code, response.Body.String())
	}
	if contentType := response.Header().Get("Content-Type"); !strings.HasPrefix(contentType, "text/plain") {
		t.Fatalf("Content-Type = %q", contentType)
	}
	body := response.Body.String()
	for _, want := range []string{
		"GET /music/search",
		"GET /music/switch_source",
		"GET /music/toplists",
		"POST /music/api/downloads/queue",
		"Existing search, playlist, album, ranking, recommendation, and category routes return the normal rendered page",
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("llms.txt missing %q: %s", want, body)
		}
	}
	if strings.Contains(body, "/api/ai/search") ||
		strings.Contains(body, "/api/ai/playlist") ||
		strings.Contains(body, "/api/ai/player") ||
		strings.Contains(body, "/api/ai/local-music") {
		t.Fatalf("llms.txt advertises removed duplicate routes: %s", body)
	}
}
