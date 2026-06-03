package services

// passesWeakLegRatio returns true when the smaller leg holds at least minWeakPercent
// of total BV on both legs (e.g. minWeakPercent=30 allows 30/70, 40/60, 50/50; blocks 20/80).
func passesWeakLegRatio(leftBV, rightBV int64, minWeakPercent float64) bool {
	if leftBV <= 0 || rightBV <= 0 {
		return false
	}
	if minWeakPercent <= 0 {
		return true
	}
	weak := leftBV
	if rightBV < weak {
		weak = rightBV
	}
	total := leftBV + rightBV
	// weak / total * 100 >= minWeakPercent  ⟺  weak * 100 >= minWeakPercent * total
	return float64(weak)*100 >= minWeakPercent*float64(total)
}
