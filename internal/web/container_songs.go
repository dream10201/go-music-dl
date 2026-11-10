package web

import (
	"fmt"
	"strings"

	"github.com/guohuiyuan/go-music-dl/core"
	"github.com/guohuiyuan/go-music-dl/lib/model"
)

const (
	collectionContentPlaylist = "playlist"
	collectionContentAlbum    = "album"
)

var (
	playlistDetailFuncProvider = core.GetPlaylistDetailFunc
	albumDetailFuncProvider    = core.GetAlbumDetailFunc
	parsePlaylistFuncProvider  = core.GetParsePlaylistFunc
	parseAlbumFuncProvider     = core.GetParseAlbumFunc
)

func loadContainerSongs(contentType, source, externalID, link string) ([]model.Song, error) {
	source = strings.TrimSpace(source)
	externalID = strings.TrimSpace(externalID)
	link = strings.TrimSpace(link)

	detail, parse := playlistDetailFuncProvider(source), parsePlaylistFuncProvider(source)
	if contentType == collectionContentAlbum {
		detail, parse = albumDetailFuncProvider(source), parseAlbumFuncProvider(source)
	}
	if externalID != "" && detail != nil {
		if songs, err := detail(externalID); err == nil && len(songs) > 0 {
			return ensureSongSource(songs, source), nil
		}
	}
	if link != "" && parse != nil {
		if _, songs, err := parse(link); err == nil {
			return ensureSongSource(songs, source), nil
		}
	}
	return nil, fmt.Errorf("failed to fetch %s songs", contentType)
}

func ensureSongSource(songs []model.Song, source string) []model.Song {
	for i := range songs {
		if strings.TrimSpace(songs[i].Source) == "" {
			songs[i].Source = source
		}
	}
	return songs
}
