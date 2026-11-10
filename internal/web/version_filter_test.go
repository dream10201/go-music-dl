package web

import (
	"net/http"
	"testing"

	"github.com/guohuiyuan/go-music-dl/core"
	"github.com/guohuiyuan/go-music-dl/lib/model"
)

func TestNameHasVersionKeywordMatchesWholeWords(t *testing.T) {
	keywords := splitVersionFilterKeywords(core.DefaultVersionFilterKeywords)
	cases := map[string]bool{
		"晴天 (Live)":          true,
		"晴天 LIVE版":           true,
		"晴天（ＬＩＶＥ）":           true,
		"晴天-live-2019":       true,
		"Alive":              false,
		"Olive Tree":         false,
		"Demons":             false,
		"Discover":           false,
		"Instrumental Mix":   true,
		"Instinct":           false,
		"夜曲 DJ版":             true,
		"夜曲(Sped  Up)":       false,
		"夜曲 (sped up)":       true,
		"演唱会现场版":             true,
		"稻香 伴奏":              true,
		"稻香":                 false,
		"Remixed Memories":   false,
		"七里香 (Demo)":         true,
		"Cover Girl":         true,
		"Recover":            false,
		"dj":                 true,
		"加速世界":               true,
		"Slowed + Reverb":    true,
		"Karaoke Version":    true,
		"Liverpool":          false,
		"Relive Live":        true,
		"Deliver (Live)":     true,
		"Inst.":              true,
		"简单爱 铃声":             true,
		"半岛铁盒 片段":            true,
		"以父之名 试听版":           true,
		"东风破 翻唱":             true,
		"最长的电影 降速版":          true,
		"Demo2":              false,
		"2Live":              false,
		"Live2":              false,
		"live_":              true,
		"Sped Upward":        false,
		"Unslowed":           false,
		"Karaoke":            true,
		"Coverage":           false,
		"DJango":             false,
		"Mojito (Cover 周杰伦)": true,
	}
	for name, want := range cases {
		if got := nameHasVersionKeyword(name, keywords); got != want {
			t.Errorf("nameHasVersionKeyword(%q) = %v, want %v", name, got, want)
		}
	}
}

func TestSearchDownloadAppliesVersionFilter(t *testing.T) {
	r, q := setupContainerTests(t)
	if err := core.SaveWebSettings(core.WebSettings{FilterVersionKeywords: true}); err != nil {
		t.Fatal(err)
	}
	songs := []model.Song{
		{ID: "1", Source: "migu", Name: "晴天"},
		{ID: "2", Source: "migu", Name: "晴天 (Live)"},
		{ID: "3", Source: "migu", Name: "Alive"},
	}
	token := cacheSearchDownloadResult(searchResult{SearchType: "song", Songs: songs})
	w := containerRequest(r, "/api/downloads/queue/search", map[string]any{"q": "test", "type": "song", "token": token, "request_id": "filter"})
	if w.Code != http.StatusAccepted {
		t.Fatalf("status = %d body=%s", w.Code, w.Body.String())
	}
	_, total, _, err := q.List(1, 50, "")
	if err != nil || total != 2 {
		t.Fatalf("queued = %d, want 2 (err=%v)", total, err)
	}
}
