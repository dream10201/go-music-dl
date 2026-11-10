package core

import "testing"

func TestNextMiguUIDRotates(t *testing.T) {
	if got := NextMiguUID("  "); got != "" {
		t.Fatalf("empty list returned %q", got)
	}
	miguUIDCursor.Store(0)
	want := []string{"1", "2", "3", "1"}
	for i, w := range want {
		if got := NextMiguUID("1, 2，\n3"); got != w {
			t.Fatalf("call %d = %q, want %q", i, got, w)
		}
	}
}
