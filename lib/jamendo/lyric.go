package jamendo

import (
	"errors"
	"github.com/guohuiyuan/go-music-dl/lib/model"
)

func GetLyrics(s *model.Song) (string, error) { return defaultJamendo.GetLyrics(s) }

func (j *Jamendo) GetLyrics(s *model.Song) (string, error) {
	if s.Source != "jamendo" {
		return "", errors.New("source mismatch")
	}
	return "", nil
}
