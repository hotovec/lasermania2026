

;titlescreen field data from game
	org $1a00
field
	dta $FE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$FE
	dta $DC,$00,$56,$00,$56,$00,$56,$00,$56,$00,$56,$00,$56,$00,$56,$DC
	dta $DC,$5A,$58,$5A,$58,$5A,$64,$66,$58,$5A,$58,$5A,$58,$5A,$58,$DC
	dta $DC,$00,$40,$42,$44,$46,$68,$6A,$48,$4A,$56,$00,$56,$00,$56,$DC
	dta $DC,$54,$60,$62,$58,$5A,$58,$5A,$58,$4C,$4E,$6C,$6E,$5A,$58,$DC
	dta $DC,$78,$7A,$7C,$56,$00,$56,$00,$56,$00,$50,$52,$70,$00,$56,$DC
	dta $DC,$5A,$58,$5A,$58,$5A,$58,$5A,$58,$5A,$74,$76,$72,$5A,$58,$DC
	dta $FE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$FE



field2	equ $2000

	run $a000
	org $a000
	
	ldx #0
	ldy #0
loop	lda field,x
	sta field2,y
p1	equ *-1
	add #1
	iny
	sta field2,y
p2	equ *-1
	
	inx
	iny
	bne loop
	
goout	jmp *

.print "export with:"
.print ".writemem view.dat 2000 L100"
