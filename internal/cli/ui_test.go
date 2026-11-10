package cli

import (
	"reflect"
	"strings"
	"testing"

	"github.com/guohuiyuan/go-music-dl/core"
)

func TestNextSearchTypeCyclesAllModes(t *testing.T) {
	if got := nextSearchType(searchTypeSong); got != searchTypePlaylist {
		t.Fatalf("nextSearchType(song) = %q, want %q", got, searchTypePlaylist)
	}
	if got := nextSearchType(searchTypePlaylist); got != searchTypeAlbum {
		t.Fatalf("nextSearchType(playlist) = %q, want %q", got, searchTypeAlbum)
	}
	if got := nextSearchType(searchTypeAlbum); got != searchTypeSong {
		t.Fatalf("nextSearchType(album) = %q, want %q", got, searchTypeSong)
	}
}

func TestPlaceholderForSearchType(t *testing.T) {
	tests := []struct {
		name       string
		searchType string
		want       string
	}{
		{name: "song", searchType: searchTypeSong, want: "歌名"},
		{name: "playlist", searchType: searchTypePlaylist, want: "歌单"},
		{name: "album", searchType: searchTypeAlbum, want: "专辑"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := placeholderForSearchType(tt.searchType); !strings.Contains(got, tt.want) {
				t.Fatalf("placeholderForSearchType(%q) = %q, want contains %q", tt.searchType, got, tt.want)
			}
		})
	}
}

func TestDefaultSourcesForSearchType(t *testing.T) {
	for _, searchType := range []string{searchTypeSong, searchTypePlaylist, searchTypeAlbum} {
		if got, want := defaultSourcesForSearchType(searchType), []string{"migu"}; !reflect.DeepEqual(got, want) {
			t.Fatalf("defaultSourcesForSearchType(%s) = %v, want %v", searchType, got, want)
		}
	}
}

func TestAlbumFunctionsAreWiredForSupportedSources(t *testing.T) {
	supported := core.GetAlbumSourceNames()
	for _, source := range supported {
		if fn := getAlbumSearchFunc(source); fn == nil {
			t.Fatalf("getAlbumSearchFunc(%q) returned nil", source)
		}
		if fn := getAlbumDetailFunc(source); fn == nil {
			t.Fatalf("getAlbumDetailFunc(%q) returned nil", source)
		}
		if fn := getParseAlbumFunc(source); fn == nil {
			t.Fatalf("getParseAlbumFunc(%q) returned nil", source)
		}
	}
}
