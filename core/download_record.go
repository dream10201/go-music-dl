package core

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/guohuiyuan/go-music-dl/lib/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	DownloadStatusSuccess = "success"
	DownloadStatusSkipped = "skipped"
	DownloadStatusFailed  = "failed"
)

// DownloadRecord keeps the user-visible download history in SQLite.
type DownloadRecord struct {
	ID        uint      `gorm:"primaryKey"`
	Name      string    `gorm:"size:512;not null;index"`
	Artist    string    `gorm:"size:512;not null;index"`
	Source    string    `gorm:"size:64;not null"`
	Status    string    `gorm:"size:32;not null;index"`
	Error     string    `gorm:"size:1024"`
	Payload   string    `gorm:"type:text" json:"-"`
	CreatedAt time.Time `gorm:"autoCreateTime;index"`
}

// downloadRecordPayload is stored with failed records so they can be re-queued.
type downloadRecordPayload struct {
	Song  model.Song `json:"song"`
	Embed bool       `json:"embed"`
}

// DownloadDedupEntry is intentionally separate from the visible history. Clearing
// the history therefore does not make previously downloaded songs downloadable again.
// RelPath 记录这首歌落在下载目录内的相对路径：文件被删除后要靠它回收这条记录，
// 否则再下载会被判定为「已下载」而跳过。
type DownloadDedupEntry struct {
	SongKey   string    `gorm:"primaryKey;size:1024"`
	Name      string    `gorm:"size:512;not null"`
	Artist    string    `gorm:"size:512;not null"`
	RelPath   string    `gorm:"size:1024"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

// DownloadDedupIndex 是去重索引的内存视图：key 为 SongKey，value 为记录到的
// 下载目录内相对路径（空字符串表示旧数据，路径未知）。
type DownloadDedupIndex map[string]string

var (
	dedupCacheMu sync.Mutex
	dedupCache   DownloadDedupIndex
)

func invalidateDedupCache() {
	dedupCacheMu.Lock()
	dedupCache = nil
	dedupCacheMu.Unlock()
}

// touchDedupCache incrementally records a newly saved dedup entry in the loaded
// cache instead of discarding it. Discarding forced the next download to reload
// and re-normalize every row (O(N) plus NFKC/繁简转换 per row); for a library of
// tens of thousands of songs that cost was paid once per downloaded track. The
// key is already normalized by songKeyFromParts, matching the lookup path. A
// nil cache is left untouched so the next read still does a full load once.
func touchDedupCache(key, relPath string) {
	key = cleanDownloadRecordText(key)
	if key == "" {
		return
	}
	dedupCacheMu.Lock()
	defer dedupCacheMu.Unlock()
	if dedupCache == nil {
		return
	}
	if relPath == "" {
		if _, ok := dedupCache[key]; ok {
			return // never overwrite a known path with an empty one
		}
	}
	dedupCache[key] = relPath
}

func initDownloadRecordTable() error {
	if err := ensureConfigDB(); err != nil {
		return err
	}
	return configDB.AutoMigrate(&DownloadRecord{}, &DownloadDedupEntry{})
}

// SaveDownloadRecord persists one download outcome and records successful songs in
// the durable de-duplication index. Control characters are removed before writing.
func SaveDownloadRecord(name, artist, source, status, errStr string) error {
	return SaveDownloadRecordWithRelPath(name, artist, source, status, errStr, "")
}

// SaveDownloadRecordWithRelPath 同 SaveDownloadRecord，额外记录文件在下载目录内的
// 相对路径，供后续校验文件是否还在磁盘上。
func SaveDownloadRecordWithRelPath(name, artist, source, status, errStr, relPath string) error {
	if err := initDownloadRecordTable(); err != nil {
		return err
	}

	name = cleanDownloadRecordText(name)
	artist = cleanDownloadRecordText(artist)
	relPath = cleanDownloadRelPath(relPath)
	record := DownloadRecord{
		Name:   name,
		Artist: artist,
		Source: cleanDownloadRecordText(source),
		Status: cleanDownloadRecordText(status),
		Error:  cleanDownloadRecordText(errStr),
	}
	return saveDownloadRecord(record, relPath)
}

func saveFailedDownloadRecord(song *model.Song, embed bool, errStr string) error {
	if err := initDownloadRecordTable(); err != nil {
		return err
	}
	record := DownloadRecord{
		Name:   cleanDownloadRecordText(song.Name),
		Artist: cleanDownloadRecordText(song.Artist),
		Source: cleanDownloadRecordText(song.Source),
		Status: DownloadStatusFailed,
		Error:  cleanDownloadRecordText(errStr),
	}
	if strings.TrimSpace(song.ID) != "" {
		if payload, err := json.Marshal(downloadRecordPayload{Song: *song, Embed: embed}); err == nil {
			record.Payload = string(payload)
		}
	}
	return saveDownloadRecord(record, "")
}

func saveDownloadRecord(record DownloadRecord, relPath string) error {
	err := configDB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&record).Error; err != nil {
			return err
		}
		if record.Status != DownloadStatusSuccess {
			return nil
		}

		return saveDownloadDedupEntry(tx, record.Name, record.Artist, relPath)
	})
	if err == nil && record.Status == DownloadStatusSuccess {
		touchDedupCache(songKeyFromParts(record.Name, record.Artist), cleanDownloadRelPath(relPath))
	}
	return err
}

// SaveDownloadDedupEntry records a song as already available locally without
// adding an item to the user-visible download history.
func SaveDownloadDedupEntry(name, artist, relPath string) error {
	if err := initDownloadRecordTable(); err != nil {
		return err
	}
	err := saveDownloadDedupEntry(configDB, name, artist, relPath)
	if err == nil {
		touchDedupCache(songKeyFromParts(name, artist), cleanDownloadRelPath(relPath))
	}
	return err
}

func saveDownloadDedupEntry(db *gorm.DB, name, artist, relPath string) error {
	name = cleanDownloadRecordText(name)
	artist = cleanDownloadRecordText(artist)
	relPath = cleanDownloadRelPath(relPath)
	entry := DownloadDedupEntry{
		SongKey: songKeyFromParts(name, artist),
		Name:    name,
		Artist:  artist,
		RelPath: relPath,
	}
	// 路径未知时不能覆盖已有路径，只有拿到了真实路径才回填。
	if relPath == "" {
		return db.Clauses(clause.OnConflict{DoNothing: true}).Create(&entry).Error
	}
	return db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "song_key"}},
		DoUpdates: clause.AssignmentColumns([]string{"rel_path"}),
	}).Create(&entry).Error
}

func cleanDownloadRecordText(value string) string {
	return strings.TrimSpace(stripControl(value))
}

// cleanDownloadRelPath 归一化下载目录内的相对路径：去掉控制字符、统一成斜杠、
// 去掉开头斜杠，保证跨平台存进 SQLite 的形态一致。
func cleanDownloadRelPath(relPath string) string {
	relPath = strings.ReplaceAll(strings.TrimSpace(stripControl(relPath)), "\\", "/")
	relPath = strings.TrimSpace(relPath)
	for strings.HasPrefix(relPath, "/") {
		relPath = strings.TrimPrefix(relPath, "/")
	}
	return relPath
}

// GetDownloadRecords returns the most recent 200 user-visible download records.
func GetDownloadRecords() ([]DownloadRecord, error) {
	records, _, _, err := GetDownloadRecordPage(1, 200, "")
	return records, err
}

// GetDownloadRecordPage returns one page of user-visible download records filtered
// by status ("" for all), the total matching that filter, and per-status counts.
func GetDownloadRecordPage(page, pageSize int, status string) ([]DownloadRecord, int64, map[string]int64, error) {
	if err := initDownloadRecordTable(); err != nil {
		return nil, 0, nil, err
	}
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 200 {
		pageSize = 200
	}

	var groups []struct {
		Status string
		Count  int64
	}
	if err := configDB.Model(&DownloadRecord{}).Select("status, count(*) as count").Group("status").Scan(&groups).Error; err != nil {
		return nil, 0, nil, err
	}
	counts := make(map[string]int64, len(groups))
	for _, g := range groups {
		counts[g.Status] = g.Count
	}
	query := configDB.Model(&DownloadRecord{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, nil, err
	}
	var records []DownloadRecord
	err := query.Order("created_at DESC, id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&records).Error
	return records, total, counts, err
}

// FailedDownloadRetryInputs builds queue inputs for failed history records that
// still carry a song payload, newest first, one per song, excluding songs that
// have since been downloaded.
func FailedDownloadRetryInputs() ([]DownloadTaskInput, error) {
	if err := initDownloadRecordTable(); err != nil {
		return nil, err
	}
	var records []DownloadRecord
	if err := configDB.Where("status = ? AND payload <> ''", DownloadStatusFailed).Order("id DESC").Find(&records).Error; err != nil {
		return nil, err
	}
	index, err := LoadDownloadDedupSet()
	if err != nil {
		return nil, err
	}
	settings := GetWebSettings()
	seen := make(map[string]bool, len(records))
	inputs := make([]DownloadTaskInput, 0, len(records))
	for _, record := range records {
		var payload downloadRecordPayload
		if err := json.Unmarshal([]byte(record.Payload), &payload); err != nil || strings.TrimSpace(payload.Song.ID) == "" || strings.TrimSpace(payload.Song.Source) == "" {
			continue
		}
		identity := payload.Song.Source + ":" + payload.Song.ID
		if seen[identity] || IsSongDownloaded(&payload.Song, index) {
			continue
		}
		seen[identity] = true
		inputs = append(inputs, DownloadTaskInput{Song: payload.Song, Directory: DownloadDirOrDefault(settings.DownloadDir), FilenameTemplate: settings.DownloadFilenameTemplate, Embed: payload.Embed})
	}
	return inputs, nil
}

// ClearDownloadRecords clears only the history displayed in the UI. The durable
// de-duplication index is retained so the download decision remains correct.
func ClearDownloadRecords() error {
	if err := initDownloadRecordTable(); err != nil {
		return err
	}
	return configDB.Where("1 = 1").Delete(&DownloadRecord{}).Error
}

// SongKey generates a stable de-duplication key from artist and title.
func SongKey(song *model.Song) string {
	artist := normalizeVariantText(cleanDownloadRecordText(song.Artist))
	name := normalizeVariantText(cleanDownloadRecordText(song.Name))
	if artist == "" {
		artist = "Unknown"
	}
	if name == "" {
		name = "Unknown"
	}
	return artist + " - " + name
}

func songKeyFromParts(name, artist string) string {
	return SongKey(&model.Song{Name: name, Artist: artist})
}

func lookupSongKey(song *model.Song, index DownloadDedupIndex) (string, string, bool) {
	if index == nil {
		return "", "", false
	}
	key := SongKey(song)
	if relPath, ok := index[key]; ok {
		return key, relPath, true
	}
	return "", "", false
}

func stripControl(value string) string {
	var builder strings.Builder
	for _, r := range value {
		if r >= 0x20 && r != 0x7f {
			builder.WriteRune(r)
		}
	}
	return builder.String()
}

// DownloadDirOrDefault 返回实际使用的下载目录（空值回落到默认目录）。
func DownloadDirOrDefault(outDir string) string {
	dir := strings.TrimSpace(outDir)
	if dir == "" {
		dir = DefaultWebDownloadDir
	}
	return filepath.Clean(dir)
}

// inspectDownloadFile 返回文件是否存在以及判断是否明确。权限错误、临时 I/O
// 故障或挂载异常返回 known=false，调用方必须保守处理，不能当作文件已删除。
func inspectDownloadFile(outDir, relPath string) (exists bool, known bool) {
	relPath = cleanDownloadRelPath(relPath)
	if relPath == "" {
		return false, false
	}
	info, err := os.Stat(filepath.Join(DownloadDirOrDefault(outDir), filepath.FromSlash(relPath)))
	if err == nil {
		return !info.IsDir(), true
	}
	if os.IsNotExist(err) {
		return false, true
	}
	return false, false
}

// DownloadFileExists 判断下载目录内的相对路径是否仍然指向一个真实文件。
func DownloadFileExists(outDir, relPath string) bool {
	exists, _ := inspectDownloadFile(outDir, relPath)
	return exists
}

// SongFileRelPath 返回去重索引里记录的文件相对路径（"" 表示没有记录或路径未知）。
func SongFileRelPath(song *model.Song, index DownloadDedupIndex) string {
	_, relPath, _ := lookupSongKey(song, index)
	return relPath
}

// IsSongDownloaded 只查去重索引，不校验磁盘。需要判断「现在还能不能跳过」时用
// IsSongStillDownloaded。
func IsSongDownloaded(song *model.Song, index DownloadDedupIndex) bool {
	_, _, exists := lookupSongKey(song, index)
	return exists
}

// IsSongStillDownloaded reports whether the song has a dedup record. Records are
// authoritative: a file moved out of the download directory still counts as
// downloaded until the record is removed through the dedup management UI.
func IsSongStillDownloaded(song *model.Song, index DownloadDedupIndex, outDir string) bool {
	return IsSongDownloaded(song, index)
}

// ForgetDownloadedSong 清理去重索引中与这首歌相关的记录（按歌名+歌手，或按文件
// 相对路径）。删除本地文件后调用，这样再下载时不会因为记录残留而被跳过。
func ForgetDownloadedSong(name, artist, relPath string) error {
	if err := initDownloadRecordTable(); err != nil {
		return err
	}
	keys := []string{songKeyFromParts(name, artist)}
	return forgetDownloadedSongWhere(keys, cleanDownloadRelPath(relPath))
}

func forgetDownloadedSongKeys(keys ...string) error {
	if err := initDownloadRecordTable(); err != nil {
		return err
	}
	return forgetDownloadedSongWhere(keys, "")
}

func forgetDownloadedSongWhere(keys []string, relPath string) error {
	conditions := make([]string, 0, 2)
	args := make([]interface{}, 0, 2)

	cleanKeys := make([]string, 0, len(keys))
	for _, key := range keys {
		if strings.TrimSpace(key) != "" {
			cleanKeys = append(cleanKeys, key)
		}
	}
	if len(cleanKeys) > 0 {
		conditions = append(conditions, "song_key IN ?")
		args = append(args, cleanKeys)
	}
	if relPath != "" {
		conditions = append(conditions, "rel_path = ?")
		args = append(args, relPath)
	}
	if len(conditions) == 0 {
		return nil
	}
	defer invalidateDedupCache()
	return configDB.Where(strings.Join(conditions, " OR "), args...).Delete(&DownloadDedupEntry{}).Error
}

// LoadDownloadDedupSet returns a private copy of the SQLite de-duplication index.
// The index is cached in memory and reloaded after any write to the dedup table.
func LoadDownloadDedupSet() (DownloadDedupIndex, error) {
	if err := initDownloadRecordTable(); err != nil {
		return nil, err
	}

	dedupCacheMu.Lock()
	defer dedupCacheMu.Unlock()
	if dedupCache == nil {
		index, err := loadDownloadDedupIndex()
		if err != nil {
			return nil, err
		}
		dedupCache = index
	}
	index := make(DownloadDedupIndex, len(dedupCache))
	for key, relPath := range dedupCache {
		index[key] = relPath
	}
	return index, nil
}

// loadDownloadDedupIndex reads the dedup table. On first use after upgrading it
// migrates successful history rows into the table, and rewrites song keys written
// before key normalization so lookups stay a single map access.
func loadDownloadDedupIndex() (DownloadDedupIndex, error) {
	var entries []DownloadDedupEntry
	if err := configDB.Find(&entries).Error; err != nil {
		return nil, err
	}
	if len(entries) == 0 {
		var records []DownloadRecord
		if err := configDB.Select("name", "artist").Where("status = ?", DownloadStatusSuccess).Find(&records).Error; err != nil {
			return nil, err
		}
		if len(records) > 0 {
			entries = make([]DownloadDedupEntry, 0, len(records))
			for _, record := range records {
				entries = append(entries, DownloadDedupEntry{
					SongKey: songKeyFromParts(record.Name, record.Artist),
					Name:    cleanDownloadRecordText(record.Name),
					Artist:  cleanDownloadRecordText(record.Artist),
				})
			}
			if err := configDB.Clauses(clause.OnConflict{DoNothing: true}).Create(&entries).Error; err != nil {
				return nil, err
			}
		}
	}

	index := make(DownloadDedupIndex, len(entries))
	for _, entry := range entries {
		key := cleanDownloadRecordText(entry.SongKey)
		if key == "" {
			continue
		}
		relPath := cleanDownloadRelPath(entry.RelPath)
		normalized := normalizeVariantText(key)
		if normalized == key {
			index[key] = relPath
			continue
		}
		_ = configDB.Exec("UPDATE OR IGNORE download_dedup_entries SET song_key = ? WHERE song_key = ?", normalized, entry.SongKey).Error
		_ = configDB.Exec("DELETE FROM download_dedup_entries WHERE song_key = ?", entry.SongKey).Error
		if existing, ok := index[normalized]; !ok || existing == "" {
			index[normalized] = relPath
		}
	}
	return index, nil
}

// PruneDownloadDedup syncs recorded file paths with a full scan of the download
// directory. Entries whose files are gone are kept. Returns the number of paths updated.
func PruneDownloadDedup(outDir string, keep map[string]string) (int, error) {
	if err := initDownloadRecordTable(); err != nil {
		return 0, err
	}
	defer invalidateDedupCache()

	var entries []DownloadDedupEntry
	if err := configDB.Find(&entries).Error; err != nil {
		return 0, err
	}

	updated := 0
	for _, entry := range entries {
		relPath := cleanDownloadRelPath(keep[entry.SongKey])
		if relPath == "" || cleanDownloadRelPath(entry.RelPath) == relPath {
			continue
		}
		if err := configDB.Model(&DownloadDedupEntry{}).
			Where("song_key = ?", entry.SongKey).
			Update("rel_path", relPath).Error; err != nil {
			return updated, err
		}
		updated++
	}
	return updated, nil
}

// DownloadDedupListItem is one row of the dedup management list.
type DownloadDedupListItem struct {
	SongKey    string    `json:"key"`
	Name       string    `json:"name"`
	Artist     string    `json:"artist"`
	RelPath    string    `json:"rel_path"`
	FileExists *bool     `json:"file_exists"`
	CreatedAt  time.Time `json:"created_at"`
}

// ListDownloadDedup returns one page of dedup records, newest first, optionally
// filtered by a substring of name, artist or path.
func ListDownloadDedup(page, pageSize int, query, outDir string) ([]DownloadDedupListItem, int64, error) {
	if err := initDownloadRecordTable(); err != nil {
		return nil, 0, err
	}
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 50
	}
	db := configDB.Model(&DownloadDedupEntry{})
	if query = strings.TrimSpace(query); query != "" {
		like := "%" + strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(query) + "%"
		db = db.Where(`name LIKE ? ESCAPE '\' OR artist LIKE ? ESCAPE '\' OR rel_path LIKE ? ESCAPE '\'`, like, like, like)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var entries []DownloadDedupEntry
	if err := db.Order("created_at DESC, song_key DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&entries).Error; err != nil {
		return nil, 0, err
	}
	items := make([]DownloadDedupListItem, 0, len(entries))
	for _, entry := range entries {
		item := DownloadDedupListItem{SongKey: entry.SongKey, Name: entry.Name, Artist: entry.Artist, RelPath: entry.RelPath, CreatedAt: entry.CreatedAt}
		if exists, known := inspectDownloadFile(outDir, entry.RelPath); known {
			item.FileExists = &exists
		}
		items = append(items, item)
	}
	return items, total, nil
}

// ForgetDownloadDedupKeys removes dedup records by key so the songs can be
// downloaded again.
func ForgetDownloadDedupKeys(keys ...string) error {
	return forgetDownloadedSongKeys(keys...)
}

// ClearDownloadDedup removes every dedup record.
func ClearDownloadDedup() error {
	if err := initDownloadRecordTable(); err != nil {
		return err
	}
	defer invalidateDedupCache()
	return configDB.Where("1 = 1").Delete(&DownloadDedupEntry{}).Error
}

func CountSkippable(queue []model.Song, index DownloadDedupIndex, outDir string) int {
	count := 0
	for i := range queue {
		if IsSongStillDownloaded(&queue[i], index, outDir) {
			count++
		}
	}
	return count
}

func DownloadWithDedupCheck(song *model.Song, outDir string, withCover, withLyrics bool, dedupSet DownloadDedupIndex) (*DownloadedSong, error) {
	return DownloadWithDedupCheckWithTemplate(song, outDir, withCover, withLyrics, "", dedupSet)
}

func DownloadWithDedupCheckWithTemplate(song *model.Song, outDir string, withCover, withLyrics bool, filenameTemplate string, dedupSet DownloadDedupIndex) (*DownloadedSong, error) {
	key := SongKey(song)
	if IsSongStillDownloaded(song, dedupSet, outDir) {
		reason := "已有下载记录（歌手+歌名相同）"
		if relPath := SongFileRelPath(song, dedupSet); relPath != "" {
			reason = "文件已存在：" + relPath
		}
		_ = SaveDownloadRecord(song.Name, song.Artist, song.Source, DownloadStatusSkipped, reason)
		return &DownloadedSong{Skipped: true, Filename: key, Warning: reason}, nil
	}

	var (
		result *DownloadedSong
		dlErr  error
	)
	if filenameTemplate == "" {
		result, dlErr = SaveSongToFile(song, outDir, withCover, withLyrics)
	} else {
		result, dlErr = SaveSongToFileWithTemplate(song, outDir, withCover, withLyrics, filenameTemplate)
	}
	if dlErr != nil {
		_ = saveFailedDownloadRecord(song, withCover, dlErr.Error())
		return result, dlErr
	}

	// 记下文件落在下载目录里的相对路径，下次判定「是否已下载」时会用它校验磁盘。
	relPath := ""
	if result != nil {
		relPath = relativeDownloadPath(outDir, result.SavedPath)
	}
	_ = SaveDownloadRecordWithRelPath(song.Name, song.Artist, song.Source, DownloadStatusSuccess, "", relPath)
	if dedupSet != nil {
		dedupSet[key] = relPath
	}
	return result, nil
}

// relativeDownloadPath 把落盘后的绝对路径换算成下载目录内的相对路径。
func relativeDownloadPath(outDir, savedPath string) string {
	savedPath = strings.TrimSpace(savedPath)
	if savedPath == "" {
		return ""
	}
	rel, err := filepath.Rel(DownloadDirOrDefault(outDir), savedPath)
	if err != nil {
		return ""
	}
	return cleanDownloadRelPath(rel)
}
