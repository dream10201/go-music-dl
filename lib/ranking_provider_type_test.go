package main

import (
	"errors"
	"testing"

	"github.com/guohuiyuan/go-music-dl/lib/apple"
	"github.com/guohuiyuan/go-music-dl/lib/bilibili"
	"github.com/guohuiyuan/go-music-dl/lib/fivesing"
	"github.com/guohuiyuan/go-music-dl/lib/jamendo"
	"github.com/guohuiyuan/go-music-dl/lib/joox"
	"github.com/guohuiyuan/go-music-dl/lib/kugou"
	"github.com/guohuiyuan/go-music-dl/lib/kuwo"
	"github.com/guohuiyuan/go-music-dl/lib/migu"
	"github.com/guohuiyuan/go-music-dl/lib/model"
	"github.com/guohuiyuan/go-music-dl/lib/netease"
	"github.com/guohuiyuan/go-music-dl/lib/provider"
	"github.com/guohuiyuan/go-music-dl/lib/qianqian"
	"github.com/guohuiyuan/go-music-dl/lib/qq"
	"github.com/guohuiyuan/go-music-dl/lib/soda"
	"github.com/guohuiyuan/go-music-dl/lib/spotify"
)

var _ provider.TopListProvider = (*netease.Netease)(nil)
var _ provider.TopListProvider = (*qq.QQ)(nil)
var _ provider.TopListProvider = (*kugou.Kugou)(nil)
var _ provider.TopListProvider = (*kuwo.Kuwo)(nil)
var _ provider.TopListProvider = (*migu.Migu)(nil)
var _ provider.TopListProvider = (*qianqian.Qianqian)(nil)
var _ provider.TopListProvider = (*soda.Soda)(nil)
var _ provider.TopListProvider = (*fivesing.Fivesing)(nil)
var _ provider.TopListProvider = (*jamendo.Jamendo)(nil)
var _ provider.TopListProvider = (*joox.Joox)(nil)
var _ provider.TopListProvider = (*bilibili.Bilibili)(nil)
var _ provider.TopListProvider = (*apple.Apple)(nil)
var _ provider.TopListProvider = (*spotify.Spotify)(nil)

var _ provider.HotSongProvider = (*netease.Netease)(nil)
var _ provider.HotSongProvider = (*qq.QQ)(nil)
var _ provider.HotSongProvider = (*kugou.Kugou)(nil)
var _ provider.HotSongProvider = (*kuwo.Kuwo)(nil)
var _ provider.HotSongProvider = (*migu.Migu)(nil)
var _ provider.HotSongProvider = (*qianqian.Qianqian)(nil)
var _ provider.HotSongProvider = (*soda.Soda)(nil)
var _ provider.HotSongProvider = (*fivesing.Fivesing)(nil)
var _ provider.HotSongProvider = (*jamendo.Jamendo)(nil)
var _ provider.HotSongProvider = (*joox.Joox)(nil)
var _ provider.HotSongProvider = (*bilibili.Bilibili)(nil)
var _ provider.HotSongProvider = (*apple.Apple)(nil)
var _ provider.HotSongProvider = (*spotify.Spotify)(nil)

var _ provider.RankingProvider = (*netease.Netease)(nil)
var _ provider.RankingProvider = (*qq.QQ)(nil)
var _ provider.RankingProvider = (*kugou.Kugou)(nil)
var _ provider.RankingProvider = (*kuwo.Kuwo)(nil)
var _ provider.RankingProvider = (*migu.Migu)(nil)
var _ provider.RankingProvider = (*qianqian.Qianqian)(nil)
var _ provider.RankingProvider = (*soda.Soda)(nil)
var _ provider.RankingProvider = (*fivesing.Fivesing)(nil)
var _ provider.RankingProvider = (*jamendo.Jamendo)(nil)
var _ provider.RankingProvider = (*joox.Joox)(nil)
var _ provider.RankingProvider = (*bilibili.Bilibili)(nil)
var _ provider.RankingProvider = (*apple.Apple)(nil)
var _ provider.RankingProvider = (*spotify.Spotify)(nil)

func TestRankingProviderUnsupported(t *testing.T) {
	// 未实现排行榜能力的平台应返回明确的 Unsupported 错误（这里以千千音乐为例）。
	if lists, err := qianqian.New("").GetTopLists(); !errors.Is(err, model.ErrTopListsUnsupported) || lists != nil {
		t.Fatalf("qianqian GetTopLists error mismatch: lists=%v err=%v", lists, err)
	}
	if songs, err := qianqian.New("").GetTopListSongs("1"); !errors.Is(err, model.ErrTopListsUnsupported) || songs != nil {
		t.Fatalf("qianqian GetTopListSongs error mismatch: songs=%v err=%v", songs, err)
	}
	if songs, err := qianqian.New("").GetHotSongs(10); !errors.Is(err, model.ErrHotSongsUnsupported) || songs != nil {
		t.Fatalf("qianqian GetHotSongs error mismatch: songs=%v err=%v", songs, err)
	}
}
