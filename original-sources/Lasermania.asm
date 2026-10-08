/*
Lasermania 2020 - original game by AVALON 1990, modified by MatoSimi

Music converted from CMC to RMT by tool CMC2RMT written during this project
Music remixed by PG
GFX revamped by PG and me

16.04.2020 - 21.05.2020

http://matosimi.atari.org

notes:
ingame vram - b800,bbc0 (second buffer)
ingame dl - ae00 (repeating lines)
statusbar vram - 5d40
gamefield - af00 (ingame vram is redrawn based on this every couple frames)

*/

C_STARTING_LEVEL = $00
C_DISABLE_INGAME_MUSIC = 0	;for debugging
C_PG_STYLE = 1		;PGs graphics style
C_GTIA_LUMINANCE = $0a	;luminance of gtia11 line		
C_USE_INFLATE = 1		;=1 - version for publishing (slower run)
			;includes depacking and inits

ZP_00	equ $00
ZP_11	equ $11 ;80 - game, 00 - end of game, ff - title
ZP_13	equ $13
ZP_14	equ $14
ZP_30_ingame_music_on	equ $30   ;0=play ingame music
do_silence	equ $31
atract	equ $4D	;looks like something redundant
;50 ...RMT
;70 ...inflate
ZP_80	equ $80
ZP_81	equ $81
ZP_82_vram1lo	equ $82	;word used to draw into vram
ZP_83_vram1hi	equ $83
ZP_84_vram2lo	equ $84
ZP_85_vram2hi	equ $85
ZP_86	equ $86
ZP_87	equ $87
ZP_88	equ $88
ZP_89	equ $89
ZP_8A	equ $8A	;word used to set laser characters in vbi
ZP_8B	equ $8B
ZP_8C	equ $8C
ZP_8D	equ $8D
ZP_90	equ $90
ZP_91	equ $91 ;sides of laser impacts on box being pushed?
ZP_92	equ $92 ;sides of laser impacts on box being pushed
ZP_93	equ $93 ;sides of laser impacts on box being pushed?
ZP_94	equ $94
ZP_95	equ $95 ;current player position (same as A6 ?)
ZP_96	equ $96 ;tank sprite direction (0-3) 
ZP_97	equ $97 ;incremental counter (8 times per second, or so)
ZP_98	equ $98 ;1=when pushing block,0 else
ZP_99	equ $99 ;index of tank movement phase (0-7)
ZP_9A	equ $9A ;future player position ($A6 changed based on controls)
ZP_9B	equ $9B
ZP_A0	equ $A0 ;vertical position of player?
ZP_A1	equ $A1 ;vertical position of box being pushed
ZP_A2	equ $A2 ;playfield position of box being pushed
ZP_A3	equ $A3 ;sets to some horizontal value when box is pushed horizontaly
ZP_A4	equ $A4 ;$10=when box is being pushed by tank (similar to $98)
ZP_A5	equ $A5 ;1=when tank is moving 
ZP_A6	equ $A6 ;current player position (index of playfield)
ZP_A8	equ $A8
ZP_A9	equ $A9 ;ff=gameplay, 1c=animation/title
ZP_AA	equ $AA ;switch-door opening/closing process
ZP_AB	equ $AB ;set to $80 when tank movement is blocked, 0 else
ZP_AC	equ $AC ;next level animation (only next)
ZP_AD_lives	equ $AD ;lives
ZP_AE_level	equ $AE ;level number in BCD - but no idea how it is changed so far
ZP_AF	equ $AF
ZP_B0	equ $B0
ZP_B1	equ $B1
ZP_B2	equ $B2
ZP_B3	equ $B3
ZP_B4_ingame_flag	equ $B4	;0=player can play, ff=new/repeat/next level animation
ZP_B5	equ $B5	;index of exit door
ZP_B6_disks_to_collect	equ $B6	;number of "coils" that remain to pass the level
ZP_B7_lenses_to_destroy	equ $B7	;number of lens that remain to pass the level
ZP_B8	equ $B8	;title screen something
ZP_B9	equ $B9	;title screen something
ZP_BA	equ $BA	;title screen something
ZP_BB	equ $BB	;ff=next level animation
ZP_BC	equ $BC	;some protection shit (should be 0)
;ZP_BD	equ $BD	;for equalizer in statusbar
;ZP_BE	equ $BE	;for equalizer in statusbar
;ZP_C1	equ $C1	;for equalizer in statusbar
pal	equ $c0	;0=pal, 1=ntsc
ntsctimer	equ $c1
ZP_D0	equ $D0	;title screen something
ZP_D1	equ $D1
ZP_D2	equ $D2
ZP_D3	equ $D3
ZP_D4	equ $D4
ZP_D5	equ $D5
ZP_D6	equ $D6
ZP_D7	equ $D7
ZP_D8	equ $D8
ZP_D9	equ $D9
ZP_DA	equ $DA
ZP_DB	equ $DB
ZP_DC	equ $DC
ZP_DD	equ $DD
ZP_DE	equ $DE
ZP_DF	equ $DF
ZP_E0	equ $E0
ZP_E1	equ $E1
ZP_E2	equ $E2
ZP_E3	equ $E3
ZP_E4	equ $E4
ZP_E5	equ $E5
ZP_E6	equ $E6
ZP_E7	equ $E7
ZP_E8	equ $E8
ZP_E9	equ $E9
ZP_EA	equ $EA
ZP_EB	equ $EB
ZP_EC	equ $EC
ZP_ED	equ $ED
ZP_EE	equ $EE
ZP_F0	equ $F0
ZP_F1	equ $F1
ZP_F3	equ $F3
ZP_F4	equ $F4
ZP_F5	equ $F5
ZP_F6	equ $F6
ZP_F7	equ $F7
ZP_F8	equ $F8
ZP_F9	equ $F9
ZP_FA	equ $FA
ZP_FB	equ $FB
ZP_FC	equ $FC
ZP_FD	equ $FD
ZP_FE	equ $FE
ZP_FF	equ $FF
L_0200	equ $0200
L_0201	equ $0201
L_021C	equ $021C
L_0222	equ $0222
L_0223	equ $0223
sdmctl	equ $022F
L_0230	equ $0230
L_0231	equ $0231
coldst	equ $0244
gprior	equ $026F
L_0289	equ $0289
L_028A	equ $028A
L_02C0	equ $02C0
L_02E0	equ $02E0
L_02FC	equ $02FC

C_KEY_ESC		equ $1C
C_KEY_CTRL_N	equ 154
C_KEY_M		equ 37
C_KEY_CTRL_M	equ 165

		icl 'matosimi_macros.asx'

msx		equ $0500	

	;inflate data (disk compatible version)
	IFT C_USE_INFLATE = 1
	
	run entrypoint 

;here come 2 data blocks, that are supposed to be inflated to
;1. 0500 - 19ff (music)
;2. 1a00 - 35c0 (level data)

;init part:
	org $2000
.local	init
	mwa #idl $230
	mva #$8a $2c4
	mva #$8e $2c5
	mva #$86 $2c6
	mva #$ff portb ;turn off basic rom a load next block
	mva #1 coldst	;reboot after reset
;detect video system
	mva #0 pal
	sta ntsctimer
	ldx 20
	inx
	inx
x1	lda vcount
	a_lt pal x2
	sta pal
x2	cpx 20
	bne x1
	lda pal
	a_lt #140 sys_ntsc
	mva #0 pal
	rts
sys_ntsc	mva #1 pal
	rts

idl	dta $70,$70,$70,$48,a(gr3)
:23	dta 8
	dta $70
	dta $70
	dta $41,a(idl)
	
gr3	ins "lm_init.gr3" ; gr3 loading pic 
	
.endl
	ini init

;pack stuff
	
pack1		ins "msx\lasermania_0500_stripped.rmt.deflate"
pack2		ins "compression\levels.xex.deflate" 		
.print "packs end here: ", *
;supposed to be $3663 (or so)

;inflate routine
.local	inflate
inflate_zp	equ $70 
inflate_data	equ $b400
		icl "inflate.asm"
.endl

entrypoint	mwa #depacking.idl $230 
		
		mwa #pack1 inflate.inputPointer
		mwa #msx-6 inflate.outputPointer
		jsr inflate
		
		mwa #pack2 inflate.inputPointer
		mwa #L_1A00_leveldata_ptrL inflate.outputPointer
		jsr inflate
		jmp my_game_init ;start of the game
		
	ELS
	
	;regular debug/coding mode
		run my_game_init
		
		org msx
		opt h-
		ins "msx\lasermania_0500_stripped.rmt"
		
		opt h+
		org $1a00
		ins "compression\levels.xex"
		
.print "leveldata end here: ",*

	EIF

;leveldata low pointer
L_1A00_leveldata_ptrL	equ $1a00
;leveldata high pointer
L_1A80_leveldata_ptrH	equ $1a80


;additional code routines - MatoSimi *******************************************
my_game_init	mva #$00 ZP_30_ingame_music_on
		jmp L_6AB7
		
;depacking gr3
.local	depacking
idl	dta $70,$70,$70,$48,a(gr3)
:23	dta 8
	dta $70
	dta $70
	dta $41,a(idl)
	
gr3	ins "lm_depa.gr3"
.endl

.proc		check_keys  
		cmp L_9EF8_direction_keys,X
		beq x0
		cmp wasd_keys,X
x0		rts

wasd_keys		dta 58,63,46,62	
;https://www.atariarchives.org/c3ba/page004.php
.endp

;modified control procedure 
repeat_delay_first	dta $ff	
quick_direction	dta $0f	;updated every frame
result_direction	dta $0f	;"sum" of quick directions (needs clearing to $0f)
last_direction	dta $0f	;direction from last performed step

.proc		control2
		
		lda repeat_delay_first
		jpl x0

		lda porta			;9DB9 AD 00 D3
		lsr @			;9DBC 4A
		lsr @			;9DBD 4A
		lsr @			;9DBE 4A
		lsr @			;9DBF 4A
		and porta		;9DC0 2D 00 D3
		sta STICK		;9DC3 8D EB 9D
		ldx skstat		;9DC6 AE 0F D2
		stx ZP_A9		;9DC9 86 A9
		cpx #$ff ;nothing pressed
		beq L_9DE3
		cpx #$f7 ;shift pressed				;9DCB E8
		beq L_9DE3		;9DCC F0 15
		lda kbcode		;9DCE AD 09 D2
		cmp #C_KEY_M
		beq music_off
		cmp #C_KEY_CTRL_M
		beq music_on
		cmp #C_KEY_ESC		;9DD1 C9 1C
		bne L_9DD7		;9DD3 D0 02
		sta ZP_A9		;9DD5 85 A9
L_9DD7		and #$3F		;9DD7 29 3F
		ldx #$03		;9DD9 A2 03
L_9DDB		
		check_keys		

		beq L_9DE7		;9DDE F0 07
		dex				;9DE0 CA
		bpl L_9DDB		;9DE1 10 F8
L_9DE3		lda #$0F		;9DE3 A9 0F
		bne L_9DEA		;9DE5 D0 03
L_9DE7		lda L_9EFC,X	;9DE7 BD FC 9E
L_9DEA		and #$00		;9DEA 29 00
STICK		equ *-1			;!
		sta quick_direction
		tax
		cpx #$0f
		beq x6 ;do not save "no move"
		lda result_direction
		cmp #$0f
		bne x6
		stx result_direction		;9DEC 8D F6 9E
x6		;lda #$FF		;9DEF A9 FF
		;sta L_02FC		;9DF1 8D FC 02
		rts			;9DF4 60

music_off		mva #$ff ZP_30_ingame_music_on
		rts
music_on		mva #0 ZP_30_ingame_music_on
		rts
		
;clear the direction when movement is being processed
clear		sta ZP_96		;94F2 85 96
		asl @
		
x7		mvx direction last_direction
		mvx #$0f direction
		stx result_direction
		rts
		
x8		mvx #$ff repeat_delay_first
		jmp x7
	
;update direction value
update		lda repeat_delay_first
		bpl x2
		mva result_direction direction
		cmp last_direction
		beq x0
		lda quick_direction
		cmp #$0f
		bne x1
		sta last_direction		
x0		rts

x1		lda last_direction ;do not delay if previous was not $0f
		cmp #$0f
		bne x0
		
		lda trig0	;fire to skip delay
		and trig1
		beq x0
		lda skstat
		cmp #$f3 ;shift+key pressed
		beq x0
		
		mva #1 repeat_delay_first
		rts
		
x2		dec repeat_delay_first
		mva #$0f direction
		rts		
.endp

.local	more_ingame_dl		
horizline
.rept 2
:1		dta 0,0,0,$0e
:11		dta $ee-$11*:1
:10		dta $44
:11		dta $44+$11*:1
:1		dta $e0,0,0,0
.endr
.endl

.proc		delete_missile_sprite
		ldy ZP_A1		
		ldx #$0f
		lda #%00001010
x1		sta L_B300_missile_data,Y
		iny				
		dex
		bpl x1
		rts
.endp		
		
;set missile underlay for pushed objects		
.proc		set_missile_sprite	
/*		ldx ZP_A2 ;index of box being pushed
		lda L_AF00_playfield,x
*/
		ldx #15

;only missile 2 used as underlay 
		lda #%00111010
x2		sta L_BFA0_box_sprite_m,x
		dex
		bpl x2
		rts
.endp


.proc		draw_side_lines
		lda #%00001010
		ldx #215
x1		sta L_B300_missile_data,x
		dex
		bne x1
		txa
		ldx #216
x2		sta L_B300_missile_data,x
		inx
		bne x2
		
		ldx #17
x3		sta L_B300_missile_data,x
		dex
		bpl x3
		
;statusbar part
		ldx #23
		lda #0
x5		sta L_B400_player0_data+216,x
		sta L_B500_player1_data+216,x
		sta L_B600_player2_data+216,x
		sta L_B700_player3_data+216,x
		dex
		bpl x5

		ldx #15
x4		mva statusbar_pmgdata,x L_B400_player0_data+218,x
		mva statusbar_pmgdata+16,x L_B500_player1_data+218,x
		mva statusbar_pmgdata+32,x L_B600_player2_data+218,x
		dex
		bpl x4
		
		ldx #19
		lda #%10000000
x6		sta L_B300_missile_data+216,x
		sta L_B700_player3_data+216,x
		dex
		bpl x6		
		rts
.endp

;update statusbar 	
.proc 		update_statusbar_values	
		mwa #statusbar_vram ZP_88
		
		lda ZP_AD_lives
		sed
		sub #1
		cld
		ldy #14
		print_number
		
		lda ZP_AE_level
		ldy #6
		print_number
		
		lda ZP_B6_disks_to_collect
		convert_to_bcd_plus_one
		ldy #32
		print_number
		
		lda ZP_B7_lenses_to_destroy
		convert_to_bcd_plus_one
		ldy #24
		print_number
		
		;second line
		ldx #39
x2		lda statusbar_vram,x
		bne x1
x3		dex
		bpl x2
		rts
		
x1		ora #$20
		sta statusbar_vram+40,x
		jmp x3	
.endp

.proc		print_number
		pha
:4		lsr @
		asl @
		add #2
		sta (ZP_88),y
		add #1
		iny	
		sta (ZP_88),y
		pla
		and #$0f
		asl @
		add #2
		iny
		sta (ZP_88),y
		add #1
		iny	
		sta (ZP_88),y
		rts
.endp

.proc		convert_to_bcd_plus_one
		ldx #0
		add #1
x2		a_ge #10 x1
		sta tmp
		txa
:4		asl @
		ora tmp		
		rts
x1		sub #10
		inx
		jmp x2
tmp		dta 0
.endp


.proc		update_level_color
		lda ZP_AE_level
		;convert bcd to binary
		ldx #$ff
		sed
		sec
x1		inx
		sbc #1
		bcs x1
		cld
		
		lda colors,x
		sta L_9FBE_gamecolors+6
		sta ingameDli.lensescolor
		rts
		
colors		
:5		dta $78
:2		dta $38
:5		dta $a8
:4		dta $58 
		dta $08
		dta $88,$f8,$78,$b8 ;20
		dta $38,$08,$28,$88,$c8,$58,$98,$d8,$18,$48 ;30
		dta $78,$c8,$38,$58,$28,$68,$a8,$48,$18,$08 ;40
		dta $28,$78,$48,$28,$98,$48,$b8,$68,$38,$f8 ;50
		dta $58,$88
	
.endp


		.align $100

L_9406_gamedl	
		dta $30
L_9407		dta $30			
		dta $4f,a(more_ingame_dl.horizline)
		dta $8f
		dta $10
		dta $c4		
L_9409_dl_vramlo	dta $00			
L_940A_dl_vramhi	dta $b8

:22		dta $84
		dta $84
		dta $10
		dta $4f,a(more_ingame_dl.horizline)
		dta $f,$10
		
L_9422_statusbarDLpart
		dta $44,a(statusbar_vram)
		dta $04
		dta $90
		dta $4f,a(more_ingame_dl.horizline)
		dta $f
		dta $41,a(L_9406_gamedl)
		
;titlescreen displaylists

.rept 3,#
titledl:1
?i = :1
 		dta $70,$70
		dta $f0,$70
		
	IFT :1 < 2
		
	.rept 8,#
		IFT :1 != 6
		dta $c4,a($bc00 + :1*$20 + ?i*$100 )
		dta $c4,a($bc00 + :1*$20 + ?i*$100 )
		ELS
		dta $c4,a($bc00 + :1*$20 + ?i*$100 )
		dta $e4,a($bc00 + :1*$20 + ?i*$100 )
		dta $44,a($bc00 + (:1+1)*$20 + ?i*$100 )
		EIF
	
	.endr

	ELS
	;scroll part
		dta $44,a(tube)
		dta $4
		dta $64,a(text) ;scroll vram
scrollptr	equ *-2
:11		dta $24
		dta $4
		dta $44,a(tube)
		dta $4
	EIF
	
		dta $30
		dta $90
		dta $44,a(undertitle) ;$69E7)
		dta $10
		dta 4
		dta $70,$70
		dta 4
		dta $41,a(titledl:1) ;$6a07)

.endr		

;all 4 displaylists fit into single page

undertitle	dta d'   START/FIRE - BEGIN GAME      '
		dta d'       SELECT - INSTRUCTIONS    '
		dta d'TRIBUTE TO AVALON AFTER 30 YEARS'*
	
tube		dta $fe,$ff
:28		dta $de
		dta $fe,$ff
		dta $fc,$fd
:28		dta $df
		dta $fc,$fd
		
;title screen animation DLI:
.local	titledli
start		pha				;6ECC 48
		sta wsync
		
:4		mva titlecolors+:1 colpf0+:1
		
		mwa #primary L_0200
		mva #17 zp_9b
		mva #0 vscrol
		pla

primary		pha				;9D76 48
		cld
		sta wsync
		dec zp_9b
		beq x1
		lda zp_9b
		lsr @
		lda zp_f3
		bcc x2
		adc #4
x2		sta chbase
		beq x1
		mwa #primary L_0200
		pla				;9D8D 68
		rti				;9D8E 40
		
x1		mwa #bottom L_0200
			
		pla
		rti
		
		
bottom		phr ;pha
		sta wsync
		mva #>L_9000_scroll_font chbase
		mva #$84 colpf0
		mva #$88 colpf1
		mva #$8a colpf2
		mva #$ba colpf2+1
	IFT C_DISABLE_INGAME_MUSIC == 0
		rmt.rmt_play_unisystem		
	EIF	
		plr ;pla
		rti
		
scroll		pha
		sta wsync
:4		mva titlecolors+:1 colpf0+:1
		mva #>L_9000_scroll_font chbase
		mwa #bottom L_0200
		pla
		rti

.endl	

.local	select
	lda consol
	cmp #$05
	jne x0

	pause 0

	mwa #titledl2 L_0230
	mva #<titledli.scroll tptr1
	mva #>titledli.scroll tptr2

	jsr hide_pmg

;L_5C00 - scroll vram
;text 
;zp_86 - word for scroll
	mwa #text scrollptr
	ldy #1
	jmp loop3
loop4	ldy #0
loop3	pause 10

	lda consol
	and trig0	
	and trig1	
	beq x1	;start game	
	
	sty vscrol
	iny
	cpy #1
	beq domagic
	cpy #8
	bne loop3
	jmp loop4

domagic	add16 #$20 scrollptr
	lda scrollptr+1
	cmp #>text+14
	bne loop3
	
	pause 0
x00	mwa #titledl0 L_0230
	mva #<titledli.start tptr1
	mva #>titledli.start tptr2

x0	jmp L_6AC8
x1	jmp L_6B7D_new_game

.endl

.print "additional code ends at: ",*
		.align $400
		;org $5000
;title screen scroll font (antic4)
L_9000_scroll_font	ins '9000_scroll_text.fnt'

;5400-5c00 - 2 titlescreen fonts containing lasermania sprite data + titlescreen grid
		;org $5400
		
titlefont		ins "new_intro\new_intro1.fnt"
		ins "new_intro\new_intro2.fnt"
		;ins '5400_titleani1.fnt'
		;ins '5800_titleani2.fnt'
title_bgfont1	equ titlefont+$200	;titlescreen graphics font 1st part (top)
title_bgfont2	equ titlefont+$600 	;titlescreen graphics font 2nd part (bottom)

;tile types (game items)
; legend: 04 - inverse
;	08 - coil (storage)
;	40 - pushable
;	20 - next level exit
element_types
		dta $00,$00,$00,$44,$80,$80,$80,$80,$04,$04,$04,$04,$04,$80,$04,$04
		dta $04,$04,$04,$04,$00,$00,$00,$00,$04,$04,$04,$04,$04,$00,$04,$04
		dta $C4,$0c,$01,$86,$01,$01,$05,$01,$14,$14,$06,$02,$02,$02,$02,$02
		dta $04,$04,$04,$04,$24,$01,$02,$02,$02,$14,$14,$14,$14,$10,$00,$44
statusbar_vram	;line1
		dta 0,0,0,0
		dta $96,$97,2,3,2,3,0,0,$18,$19,2,3,2,3
		dta 0,0,0,0
		dta $9c,$9d,2,3,2,3,0,0,$9a,$9b,2,3,2,3
		dta 0,0,0,0
		;line2
:40		dta 0

;tank,coil,lens
statusbar_pmgdata	ins 'status_gfx\pmgdata.dat'

	
L_5DC0	jmp L_5EB0		;5DC0 4C B0 5E
	jmp $ffff
L_5DC6	dta $02,$02,$02,$02,$02,$02,$02,$02,$02,$02,$02,$02,$02,$02,$02,$02
		dta $02,$02,$02,$02,$02
L_5DDB	dta $00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00
		dta $00,$00,$00,$00,$00
L_5DF0	dta $00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00
		dta $00,$00,$00,$00,$00
L_5E05	dta $00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00
		dta $00,$00,$00,$00,$00




		guard $5e1a
;===============================================================================
;code that initializes the flying letters animation
;this is anchored (do not move to other location)
		org $5e1a
init_animation	stx ZP_F0		;5E1A 86 F0
		sty ZP_F1		;5E1C 84 F1
		jsr L_63E7		;5E1E 20 E7 63
		ldy #$00		;5E21 A0 00
		lda (ZP_F0),Y	;5E23 B1 F0
		sta L_5FCD		;5E25 8D CD 5F
		iny				;5E28 C8
		lda (ZP_F0),Y	;5E29 B1 F0
		tax				;5E2B AA
		stx L_5FA5		;5E2C 8E A5 5F
		dex				;5E2F CA
		stx L_5EC7		;5E30 8E C7 5E
		iny				;5E33 C8
		lda (ZP_F0),Y	;5E34 B1 F0
		sta L_5EF5		;5E36 8D F5 5E
		sta L_60F7		;5E39 8D F7 60
		sta L_614D		;5E3C 8D 4D 61
		sta L_6182		;5E3F 8D 82 61
		sta L_61D6		;5E42 8D D6 61
		iny				;5E45 C8
		lda (ZP_F0),Y	;5E46 B1 F0
		sta L_5F51		;5E48 8D 51 5F
		iny				;5E4B C8
		lda (ZP_F0),Y	;5E4C B1 F0
		sta L_5F4D		;5E4E 8D 4D 5F
		sta L_6107		;5E51 8D 07 61
		sta L_6137		;5E54 8D 37 61
		iny				;5E57 C8
		lda (ZP_F0),Y	;5E58 B1 F0
		sta L_5F3F		;5E5A 8D 3F 5F
		sta L_611D		;5E5D 8D 1D 61
		tax				;5E60 AA
		inx				;5E61 E8
		inx				;5E62 E8
		stx L_5F30		;5E63 8E 30 5F
		sec				;5E66 38
		sbc #$03		;5E67 E9 03
		sta L_5F07		;5E69 8D 07 5F
		ldx #$00		;5E6C A2 00
L_5E6E	iny				;5E6E C8
		lda L_6413,X	;5E6F BD 13 64
		beq L_5E86		;5E72 F0 12
		sta L_5E81		;5E74 8D 81 5E
		lda L_6412,X	;5E77 BD 12 64
		sta L_5E80		;5E7A 8D 80 5E
		lda (ZP_F0),Y	;5E7D B1 F0
L_5E7F	sta L_5E7F		;5E7F 8D 7F 5E
L_5E80	equ *-2			;!
L_5E81	equ *-1			;!
		inx				;5E82 E8
		inx				;5E83 E8
		bne L_5E6E		;5E84 D0 E8
L_5E86	lda L_63C5		;5E86 AD C5 63
		sta L_63E1		;5E89 8D E1 63
		lda L_63C9		;5E8C AD C9 63
		sta L_63DD		;5E8F 8D DD 63
		lda #$00		;5E92 A9 00
		sta L_674F		;5E94 8D 4F 67
		sta L_6848		;5E97 8D 48 68
		jsr L_5F13		;5E9A 20 13 5F
		jsr L_5F2B		;5E9D 20 2B 5F
		jsr L_5F7A		;5EA0 20 7A 5F
		jsr L_5F62		;5EA3 20 62 5F
		lda #$00		;5EA6 A9 00
		sta ZP_F5		;5EA8 85 F5
		jsr L_639C		;5EAA 20 9C 63
		jmp L_63F2		;5EAD 4C F2 63
L_5EB0	jsr L_63E7		;5EB0 20 E7 63
		jsr L_5F94		;5EB3 20 94 5F
		jsr L_639C		;5EB6 20 9C 63
		jsr L_5EBF		;5EB9 20 BF 5E
		jmp L_63F2		;5EBC 4C F2 63
L_5EBF	ldy #$15		;5EBF A0 15
		lda (ZP_FA),Y	;5EC1 B1 FA
		bne L_5EC6		;5EC3 D0 01
		rts				;5EC5 60
L_5EC6	ldy #$09		;5EC6 A0 09
L_5EC7	equ *-1			;!
		sty ZP_EA		;5EC8 84 EA
L_5ECA	lda (ZP_FA),Y	;5ECA B1 FA
		sta ZP_F0		;5ECC 85 F0
		tya				;5ECE 98
		clc				;5ECF 18
		adc #$15		;5ED0 69 15
		tay				;5ED2 A8
		lda (ZP_FA),Y	;5ED3 B1 FA
		sta ZP_F1		;5ED5 85 F1
		lda ZP_EA		;5ED7 A5 EA
		asl @			;5ED9 0A
		sta ZP_EB		;5EDA 85 EB
		asl @			;5EDC 0A
		adc ZP_EB		;5EDD 65 EB
		adc #$2A		;5EDF 69 2A
		adc ZP_FA		;5EE1 65 FA
		sta L_5EF2		;5EE3 8D F2 5E
		lda ZP_FB		;5EE6 A5 FB
		adc #$00		;5EE8 69 00
		sta L_5EF3		;5EEA 8D F3 5E
		ldx #$00		;5EED A2 00
		ldy #$00		;5EEF A0 00
L_5EF1	lda L_5EF1,X	;5EF1 BD F1 5E
L_5EF2	equ *-2			;!
L_5EF3	equ *-1			;!
		cmp #$40		;5EF4 C9 40
L_5EF5	equ *-1			;!
		beq L_5EFA		;5EF6 F0 02
		sta (ZP_F0),Y	;5EF8 91 F0
L_5EFA	iny				;5EFA C8
		inx				;5EFB E8
		cpx #$06		;5EFC E0 06
		bcs L_5F0C		;5EFE B0 0C
		cpx #$03		;5F00 E0 03
		bne L_5EF1		;5F02 D0 ED
		tya				;5F04 98
		clc				;5F05 18
		adc #$25		;5F06 69 25
L_5F07	equ *-1			;!
		tay				;5F08 A8
		jmp L_5EF1		;5F09 4C F1 5E
L_5F0C	dec ZP_EA		;5F0C C6 EA
		ldy ZP_EA		;5F0E A4 EA
		bpl L_5ECA		;5F10 10 B8
		rts				;5F12 60
L_5F13	ldx #$00		;5F13 A2 00
L_5F15	txa				;5F15 8A
		sta ZP_EE		;5F16 85 EE
		asl @			;5F18 0A
		ora ZP_EE		;5F19 05 EE
		and #$AA		;5F1B 29 AA
		sta ZP_EE		;5F1D 85 EE
		lsr @			;5F1F 4A
		ora ZP_EE		;5F20 05 EE
		eor #$FF		;5F22 49 FF
		sta L_643A,X	;5F24 9D 3A 64
		inx				;5F27 E8
		bne L_5F15		;5F28 D0 EB
		rts				;5F2A 60
L_5F2B	ldx #$00		;5F2B A2 00
		txa				;5F2D 8A
		sec				;5F2E 38
		sbc #$2A		;5F2F E9 2A
L_5F30	equ *-1			;!
		sta L_67E2		;5F31 8D E2 67
		txa				;5F34 8A
		sbc #$00		;5F35 E9 00
		sta L_67F2		;5F37 8D F2 67
L_5F3A	clc				;5F3A 18
		lda L_67E2,X	;5F3B BD E2 67
		adc #$28		;5F3E 69 28
L_5F3F	equ *-1			;!
		sta L_67E3,X	;5F40 9D E3 67
		lda L_67F2,X	;5F43 BD F2 67
		adc #$00		;5F46 69 00
		sta L_67F3,X	;5F48 9D F3 67
		inx				;5F4B E8
		cpx #$0C		;5F4C E0 0C
L_5F4D	equ *-1			;!
		bcc L_5F3A		;5F4E 90 EA
		lda #$28		;5F50 A9 28
L_5F51	equ *-1			;!
		asl @			;5F52 0A
		asl @			;5F53 0A
		sta L_63FF		;5F54 8D FF 63
		adc #$04		;5F57 69 04
		sta L_6400		;5F59 8D 00 64
		adc #$04		;5F5C 69 04
		sta L_6401		;5F5E 8D 01 64
		rts				;5F61 60
L_5F62	ldx #$00		;5F62 A2 00
L_5F64	txa				;5F64 8A
		ldy #$03		;5F65 A0 03
L_5F67	asl @			;5F67 0A
		rol ZP_F0		;5F68 26 F0
		asl @			;5F6A 0A
		ror L_653A,X	;5F6B 7E 3A 65
		lsr ZP_F0		;5F6E 46 F0
		ror L_653A,X	;5F70 7E 3A 65
		dey				;5F73 88
		bpl L_5F67		;5F74 10 F1
		inx				;5F76 E8
		bne L_5F64		;5F77 D0 EB
		rts				;5F79 60
L_5F7A	ldx #$00		;5F7A A2 00
L_5F7C	txa				;5F7C 8A
		ldy #$00		;5F7D A0 00
		sty ZP_F0		;5F7F 84 F0
		asl @			;5F81 0A
		asl @			;5F82 0A
		rol ZP_F0		;5F83 26 F0
		asl @			;5F85 0A
		rol ZP_F0		;5F86 26 F0
		sta L_663A,X	;5F88 9D 3A 66
		lda ZP_F0		;5F8B A5 F0
		sta L_66BA,X	;5F8D 9D BA 66
		inx				;5F90 E8
		bpl L_5F7C		;5F91 10 E9
		rts				;5F93 60
L_5F94	lda #$FF		;5F94 A9 FF
		sta ZP_E8		;5F96 85 E8
		lda #$2A		;5F98 A9 2A
		sta ZP_EE		;5F9A 85 EE
		lda #$00		;5F9C A9 00
		sta ZP_E5		;5F9E 85 E5
L_5FA0	inc ZP_E8		;5FA0 E6 E8
		ldx ZP_E8		;5FA2 A6 E8
		cpx #$0A		;5FA4 E0 0A
L_5FA5	equ *-1			;!
		bcc L_5FA9		;5FA6 90 01
		rts				;5FA8 60
L_5FA9	lda L_5DDB,X	;5FA9 BD DB 5D
		sta ZP_E6		;5FAC 85 E6
		lda L_5DF0,X	;5FAE BD F0 5D
		sta ZP_E7		;5FB1 85 E7
		lda L_5DC6,X	;5FB3 BD C6 5D
		ldy #$00		;5FB6 A0 00
		sty ZP_F0		;5FB8 84 F0
		asl @			;5FBA 0A
		asl @			;5FBB 0A
		rol ZP_F0		;5FBC 26 F0
		asl @			;5FBE 0A
		rol ZP_F0		;5FBF 26 F0
		asl @			;5FC1 0A
		rol ZP_F0		;5FC2 26 F0
		sta ZP_D2		;5FC4 85 D2
		ora #$08		;5FC6 09 08
		sta ZP_D4		;5FC8 85 D4
		lda ZP_F0		;5FCA A5 F0
		adc #$F0		;5FCC 69 F0
L_5FCD	equ *-1			;!
		sta ZP_D3		;5FCE 85 D3
		sta ZP_D5		;5FD0 85 D5
		lda L_5E05,X	;5FD2 BD 05 5E
		sta ZP_ED		;5FD5 85 ED
		bit ZP_ED		;5FD7 24 ED
		bmi L_5FDE		;5FD9 30 03
		jmp L_606A		;5FDB 4C 6A 60
L_5FDE	bvc L_602C		;5FDE 50 4C
		ldx #$07		;5FE0 A2 07
		stx ZP_F0		;5FE2 86 F0
		ldy #$00		;5FE4 A0 00
L_5FE6	lda (ZP_D2),Y	;5FE6 B1 D2
		tax				;5FE8 AA
		lda L_653A,X	;5FE9 BD 3A 65
		ldx ZP_F0		;5FEC A6 F0
		sta L_680A,X	;5FEE 9D 0A 68
		lda (ZP_D4),Y	;5FF1 B1 D4
		tax				;5FF3 AA
		lda L_653A,X	;5FF4 BD 3A 65
		ldx ZP_F0		;5FF7 A6 F0
		sta L_6802,X	;5FF9 9D 02 68
		iny				;5FFC C8
		dec ZP_F0		;5FFD C6 F0
		bpl L_5FE6		;5FFF 10 E5
		clc				;6001 18
		lda ZP_D3		;6002 A5 D3
		adc #$04		;6004 69 04
		sta ZP_D3		;6006 85 D3
		lda ZP_D5		;6008 A5 D5
		adc #$04		;600A 69 04
		sta ZP_D5		;600C 85 D5
		dey				;600E 88
L_600F	inc ZP_F0		;600F E6 F0
		lda (ZP_D2),Y	;6011 B1 D2
		tax				;6013 AA
		lda L_653A,X	;6014 BD 3A 65
		ldx ZP_F0		;6017 A6 F0
		sta L_640A,X	;6019 9D 0A 64
		lda (ZP_D4),Y	;601C B1 D4
		tax				;601E AA
		lda L_653A,X	;601F BD 3A 65
		ldx ZP_F0		;6022 A6 F0
		sta L_6402,X	;6024 9D 02 64
		dey				;6027 88
		bpl L_600F		;6028 10 E5
		bmi L_609A		;602A 30 6E
L_602C	ldy #$00		;602C A0 00
L_602E	lda (ZP_D2),Y	;602E B1 D2
		tax				;6030 AA
		lda L_653A,X	;6031 BD 3A 65
		sta L_640A,Y	;6034 99 0A 64
		lda (ZP_D4),Y	;6037 B1 D4
		tax				;6039 AA
		lda L_653A,X	;603A BD 3A 65
		sta L_6402,Y	;603D 99 02 64
		iny				;6040 C8
		cpy #$08		;6041 C0 08
		bcc L_602E		;6043 90 E9
		clc				;6045 18
		lda ZP_D3		;6046 A5 D3
		adc #$04		;6048 69 04
		sta ZP_D3		;604A 85 D3
		lda ZP_D5		;604C A5 D5
		adc #$04		;604E 69 04
		sta ZP_D5		;6050 85 D5
		dey				;6052 88
L_6053	lda (ZP_D2),Y	;6053 B1 D2
		tax				;6055 AA
		lda L_653A,X	;6056 BD 3A 65
		sta L_680A,Y	;6059 99 0A 68
		lda (ZP_D4),Y	;605C B1 D4
		tax				;605E AA
		lda L_653A,X	;605F BD 3A 65
		sta L_6802,Y	;6062 99 02 68
		dey				;6065 88
		bpl L_6053		;6066 10 EB
		bmi L_609A		;6068 30 30
L_606A	bvc L_60A9		;606A 50 3D
		ldx #$07		;606C A2 07
		ldy #$00		;606E A0 00
L_6070	lda (ZP_D2),Y	;6070 B1 D2
		sta L_6802,X	;6072 9D 02 68
		lda (ZP_D4),Y	;6075 B1 D4
		sta L_680A,X	;6077 9D 0A 68
		iny				;607A C8
		dex				;607B CA
		bpl L_6070		;607C 10 F2
		clc				;607E 18
		lda ZP_D3		;607F A5 D3
		adc #$04		;6081 69 04
		sta ZP_D3		;6083 85 D3
		lda ZP_D5		;6085 A5 D5
		adc #$04		;6087 69 04
		sta ZP_D5		;6089 85 D5
		dey				;608B 88
L_608C	inx				;608C E8
		lda (ZP_D2),Y	;608D B1 D2
		sta L_6402,X	;608F 9D 02 64
		lda (ZP_D4),Y	;6092 B1 D4
		sta L_640A,X	;6094 9D 0A 64
		dey				;6097 88
		bpl L_608C		;6098 10 F2
L_609A	lda #$02		;609A A9 02
		sta ZP_D2		;609C 85 D2
		clc				;609E 18
		adc #$08		;609F 69 08
		sta ZP_D4		;60A1 85 D4
		lda #$64		;60A3 A9 64
		sta ZP_D3		;60A5 85 D3
		sta ZP_D5		;60A7 85 D5
L_60A9	lda ZP_E6		;60A9 A5 E6
		and #$03		;60AB 29 03
		tay				;60AD A8
		asl @			;60AE 0A
		tax				;60AF AA
		lda L_642E,X	;60B0 BD 2E 64
		sta L_6291		;60B3 8D 91 62
		lda L_642F,X	;60B6 BD 2F 64
		sta L_6292		;60B9 8D 92 62
		lda L_6424,Y	;60BC B9 24 64
		sta L_62A7		;60BF 8D A7 62
		eor #$FF		;60C2 49 FF
		sta L_62AD		;60C4 8D AD 62
		lda #$FF		;60C7 A9 FF
		sta ZP_E9		;60C9 85 E9
		lda ZP_ED		;60CB A5 ED
		and #$01		;60CD 29 01
		asl @			;60CF 0A
		tax				;60D0 AA
		lda L_6436,X	;60D1 BD 36 64
		sta L_62B3		;60D4 8D B3 62
		lda L_6437,X	;60D7 BD 37 64
		sta L_62B4		;60DA 8D B4 62
		jsr L_6196		;60DD 20 96 61
		jsr L_61FE		;60E0 20 FE 61
		jsr L_61CD		;60E3 20 CD 61
		sta ZP_EC		;60E6 85 EC
		jsr L_61D8		;60E8 20 D8 61
		jsr L_6239		;60EB 20 39 62
		lda ZP_E7		;60EE A5 E7
		cmp #$10		;60F0 C9 10
		bcs L_6106		;60F2 B0 12
		ldy ZP_EE		;60F4 A4 EE
		lda #$40		;60F6 A9 40
L_60F7	equ *-1			;!
		sta (ZP_FA),Y	;60F8 91 FA
		iny				;60FA C8
		sta (ZP_FA),Y	;60FB 91 FA
		iny				;60FD C8
		sta (ZP_FA),Y	;60FE 91 FA
		iny				;6100 C8
		sty ZP_EE		;6101 84 EE
		jmp L_6119		;6103 4C 19 61
L_6106	lda #$0C		;6106 A9 0C
L_6107	equ *-1			;!
		asl @			;6108 0A
		asl @			;6109 0A
		asl @			;610A 0A
		asl @			;610B 0A
		adc #$10		;610C 69 10
		ldx #$06		;610E A2 06
		cmp ZP_E7		;6110 C5 E7
		beq L_614A		;6112 F0 36
		bcc L_614A		;6114 90 34
		jsr L_6159		;6116 20 59 61
L_6119	clc				;6119 18
		lda ZP_D0		;611A A5 D0
		adc #$28		;611C 69 28
L_611D	equ *-1			;!
		sta ZP_D0		;611E 85 D0
		bcc L_6124		;6120 90 02
		inc ZP_D1		;6122 E6 D1
L_6124	jsr L_61FE		;6124 20 FE 61
		clc				;6127 18
		lda ZP_EC		;6128 A5 EC
		adc #$03		;612A 69 03
		sta ZP_EC		;612C 85 EC
		jsr L_61D8		;612E 20 D8 61
		ldy #$00		;6131 A0 00
		jsr L_625D		;6133 20 5D 62
		lda #$0C		;6136 A9 0C
L_6137	equ *-1			;!
		asl @			;6138 0A
		asl @			;6139 0A
		asl @			;613A 0A
		asl @			;613B 0A
		ldx #$03		;613C A2 03
		cmp ZP_E7		;613E C5 E7
		beq L_614A		;6140 F0 08
		bcc L_614A		;6142 90 06
		jsr L_6159		;6144 20 59 61
		jmp L_5FA0		;6147 4C A0 5F
L_614A	ldy ZP_EE		;614A A4 EE
		lda #$40		;614C A9 40
L_614D	equ *-1			;!
L_614E	sta (ZP_FA),Y	;614E 91 FA
		iny				;6150 C8
		dex				;6151 CA
		bne L_614E		;6152 D0 FA
		sty ZP_EE		;6154 84 EE
		jmp L_5FA0		;6156 4C A0 5F
L_6159	lda ZP_E6		;6159 A5 E6
		ldx #$FF		;615B A2 FF
L_615D	inx				;615D E8
		cpx #$05		;615E E0 05
		beq L_6167		;6160 F0 05
		cmp L_63FD,X	;6162 DD FD 63
		bcs L_615D		;6165 B0 F6
L_6167	lda L_6428,X	;6167 BD 28 64
		ora ZP_E5		;616A 05 E5
		asl @			;616C 0A
		asl @			;616D 0A
		asl @			;616E 0A
		asl @			;616F 0A
		sta ZP_E5		;6170 85 E5
		ldy #$00		;6172 A0 00
		ldx ZP_EC		;6174 A6 EC
L_6176	lda (ZP_D0),Y	;6176 B1 D0
		sty ZP_F0		;6178 84 F0
		ldy ZP_EE		;617A A4 EE
		asl ZP_E5		;617C 06 E5
		php				;617E 08
		bpl L_6183		;617F 10 02
		lda #$40		;6181 A9 40
L_6182	equ *-1			;!
L_6183	sta (ZP_FA),Y	;6183 91 FA
		inc ZP_EE		;6185 E6 EE
		ldy ZP_F0		;6187 A4 F0
		txa				;6189 8A
		plp				;618A 28
		bmi L_618F		;618B 30 02
		sta (ZP_D0),Y	;618D 91 D0
L_618F	inx				;618F E8
		iny				;6190 C8
		cpy #$03		;6191 C0 03
		bcc L_6176		;6193 90 E1
		rts				;6195 60
L_6196	lda ZP_E6		;6196 A5 E6
		lsr @			;6198 4A
		lsr @			;6199 4A
		sta ZP_F0		;619A 85 F0
		lda ZP_E7		;619C A5 E7
		lsr @			;619E 4A
		lsr @			;619F 4A
		lsr @			;61A0 4A
		lsr @			;61A1 4A
		tax				;61A2 AA
		clc				;61A3 18
		lda L_67E2,X	;61A4 BD E2 67
		adc ZP_F0		;61A7 65 F0
		sta ZP_D0		;61A9 85 D0
		lda L_67F2,X	;61AB BD F2 67
		adc ZP_F7		;61AE 65 F7
		sta ZP_D1		;61B0 85 D1
		clc				;61B2 18
		lda ZP_F6		;61B3 A5 F6
		adc ZP_D0		;61B5 65 D0
		sta ZP_D0		;61B7 85 D0
		bcc L_61BD		;61B9 90 02
		inc ZP_D1		;61BB E6 D1
L_61BD	ldy ZP_E8		;61BD A4 E8
		lda ZP_D0		;61BF A5 D0
		sta (ZP_FA),Y	;61C1 91 FA
		tya				;61C3 98
		clc				;61C4 18
		adc #$15		;61C5 69 15
		tay				;61C7 A8
		lda ZP_D1		;61C8 A5 D1
		sta (ZP_FA),Y	;61CA 91 FA
		rts				;61CC 60
L_61CD	lda ZP_E8		;61CD A5 E8
		asl @			;61CF 0A
		sta ZP_F0		;61D0 85 F0
		asl @			;61D2 0A
		adc ZP_F0		;61D3 65 F0
		adc #$40		;61D5 69 40
L_61D6	equ *-1			;!
		rts				;61D7 60
L_61D8	tax				;61D8 AA
		lda L_66BA,X	;61D9 BD BA 66
		ora ZP_F9		;61DC 05 F9
		sta ZP_E0		;61DE 85 E0
		lda L_66BB,X	;61E0 BD BB 66
		ora ZP_F9		;61E3 05 F9
		sta ZP_E2		;61E5 85 E2
		lda L_66BC,X	;61E7 BD BC 66
		ora ZP_F9		;61EA 05 F9
		sta ZP_E4		;61EC 85 E4
		lda L_663A,X	;61EE BD 3A 66
		sta ZP_DF		;61F1 85 DF
		lda L_663B,X	;61F3 BD 3B 66
		sta ZP_E1		;61F6 85 E1
		lda L_663C,X	;61F8 BD 3C 66
		sta ZP_E3		;61FB 85 E3
		rts				;61FD 60
L_61FE	ldy #$00		;61FE A0 00
		lda (ZP_D0),Y	;6200 B1 D0
		tax				;6202 AA
		asl @			;6203 0A
		rol ZP_E5		;6204 26 E5
		lda L_66BA,X	;6206 BD BA 66
		ora ZP_F9		;6209 05 F9
		sta ZP_DA		;620B 85 DA
		lda L_663A,X	;620D BD 3A 66
		sta ZP_D9		;6210 85 D9
		iny				;6212 C8
		lda (ZP_D0),Y	;6213 B1 D0
		tax				;6215 AA
		asl @			;6216 0A
		rol ZP_E5		;6217 26 E5
		lda L_66BA,X	;6219 BD BA 66
		ora ZP_F9		;621C 05 F9
		sta ZP_DC		;621E 85 DC
		lda L_663A,X	;6220 BD 3A 66
		sta ZP_DB		;6223 85 DB
		iny				;6225 C8
		lda (ZP_D0),Y	;6226 B1 D0
		tax				;6228 AA
		asl @			;6229 0A
		rol ZP_E5		;622A 26 E5
		lda L_66BA,X	;622C BD BA 66
		ora ZP_F9		;622F 05 F9
		sta ZP_DE		;6231 85 DE
		lda L_663A,X	;6233 BD 3A 66
		sta ZP_DD		;6236 85 DD
		rts				;6238 60
L_6239	lda ZP_E7		;6239 A5 E7
		and #$0F		;623B 29 0F
		sta ZP_EB		;623D 85 EB
		ldy #$00		;623F A0 00
		cpy ZP_EB		;6241 C4 EB
		bcs L_625D		;6243 B0 18
L_6245	lda (ZP_D9),Y	;6245 B1 D9
		sta (ZP_DF),Y	;6247 91 DF
		lda (ZP_DB),Y	;6249 B1 DB
		sta (ZP_E1),Y	;624B 91 E1
		lda (ZP_DD),Y	;624D B1 DD
		sta (ZP_E3),Y	;624F 91 E3
		iny				;6251 C8
		cpy #$08		;6252 C0 08
		bne L_6259		;6254 D0 03
		jsr L_6335		;6256 20 35 63
L_6259	cpy ZP_EB		;6259 C4 EB
		bcc L_6245		;625B 90 E8
L_625D	sty ZP_EA		;625D 84 EA
		inc ZP_E9		;625F E6 E9
		ldy ZP_E9		;6261 A4 E9
		cpy #$10		;6263 C0 10
		bcc L_626A		;6265 90 03
		jmp L_631A		;6267 4C 1A 63
L_626A	cpy #$08		;626A C0 08
		bne L_6287		;626C D0 19
		clc				;626E 18
		lda ZP_D2		;626F A5 D2
		adc #$F8		;6271 69 F8
		sta ZP_D2		;6273 85 D2
		lda ZP_D3		;6275 A5 D3
		adc #$03		;6277 69 03
		sta ZP_D3		;6279 85 D3
		lda ZP_D4		;627B A5 D4
		adc #$F8		;627D 69 F8
		sta ZP_D4		;627F 85 D4
		lda ZP_D5		;6281 A5 D5
		adc #$03		;6283 69 03
		sta ZP_D5		;6285 85 D5
L_6287	lda (ZP_D2),Y	;6287 B1 D2
		tax				;6289 AA
		lda (ZP_D4),Y	;628A B1 D4
		sta ZP_D7		;628C 85 D7
		lsr @			;628E 4A
		txa				;628F 8A
L_6290	jmp L_6290		;6290 4C 90 62
L_6291	equ *-2			;!
L_6292	equ *-1			;!
L_6293	ror @			;6293 6A
		ror ZP_D7		;6294 66 D7
		ror @			;6296 6A
		ror ZP_D7		;6297 66 D7
		ror @			;6299 6A
		ror ZP_D7		;629A 66 D7
		ror @			;629C 6A
		ror ZP_D7		;629D 66 D7
		ror @			;629F 6A
		ror ZP_D7		;62A0 66 D7
		ror @			;62A2 6A
		ror ZP_D7		;62A3 66 D7
		tax				;62A5 AA
		and #$00		;62A6 29 00
L_62A7	equ *-1			;!
		sta ZP_D6		;62A8 85 D6
		txa				;62AA 8A
		ror @			;62AB 6A
		and #$00		;62AC 29 00
L_62AD	equ *-1			;!
		sta ZP_D8		;62AE 85 D8
		ldy ZP_EA		;62B0 A4 EA
L_62B2	jmp L_62B2		;62B2 4C B2 62
L_62B3	equ *-2			;!
L_62B4	equ *-1			;!
L_62B5	ldx ZP_D8		;62B5 A6 D8
		lda (ZP_DD),Y	;62B7 B1 DD
		and L_643A,X	;62B9 3D 3A 64
		ora ZP_D8		;62BC 05 D8
		sta (ZP_E3),Y	;62BE 91 E3
		lda (ZP_DB),Y	;62C0 B1 DB
		ldx ZP_D7		;62C2 A6 D7
		and L_643A,X	;62C4 3D 3A 64
		ora ZP_D7		;62C7 05 D7
		sta (ZP_E1),Y	;62C9 91 E1
		lda (ZP_D9),Y	;62CB B1 D9
		ldx ZP_D6		;62CD A6 D6
		and L_643A,X	;62CF 3D 3A 64
		ora ZP_D6		;62D2 05 D6
		sta (ZP_DF),Y	;62D4 91 DF
		iny				;62D6 C8
		cpy #$08		;62D7 C0 08
		bne L_62DE		;62D9 D0 03
		jsr L_6335		;62DB 20 35 63
L_62DE	cpy #$10		;62DE C0 10
		bcs L_62E5		;62E0 B0 03
		jmp L_625D		;62E2 4C 5D 62
L_62E5	rts				;62E5 60
L_62E6	lda (ZP_DD),Y	;62E6 B1 DD
		tax				;62E8 AA
		lda ZP_D8		;62E9 A5 D8
		and L_643A,X	;62EB 3D 3A 64
		ora (ZP_DD),Y	;62EE 11 DD
		sta (ZP_E3),Y	;62F0 91 E3
		lda (ZP_DB),Y	;62F2 B1 DB
		tax				;62F4 AA
		lda ZP_D7		;62F5 A5 D7
		and L_643A,X	;62F7 3D 3A 64
		ora (ZP_DB),Y	;62FA 11 DB
		sta (ZP_E1),Y	;62FC 91 E1
		lda (ZP_D9),Y	;62FE B1 D9
		tax				;6300 AA
		lda ZP_D6		;6301 A5 D6
		and L_643A,X	;6303 3D 3A 64
		ora (ZP_D9),Y	;6306 11 D9
		sta (ZP_DF),Y	;6308 91 DF
		iny				;630A C8
		cpy #$08		;630B C0 08
		bne L_6312		;630D D0 03
		jsr L_6335		;630F 20 35 63
L_6312	cpy #$10		;6312 C0 10
		bcs L_6319		;6314 B0 03
		jmp L_625D		;6316 4C 5D 62
L_6319	rts				;6319 60
L_631A	ldy ZP_EA		;631A A4 EA
L_631C	lda (ZP_D9),Y	;631C B1 D9
		sta (ZP_DF),Y	;631E 91 DF
		lda (ZP_DB),Y	;6320 B1 DB
		sta (ZP_E1),Y	;6322 91 E1
		lda (ZP_DD),Y	;6324 B1 DD
		sta (ZP_E3),Y	;6326 91 E3
		iny				;6328 C8
		cpy #$08		;6329 C0 08
		bne L_6330		;632B D0 03
		jsr L_6335		;632D 20 35 63
L_6330	cpy #$10		;6330 C0 10
		bcc L_631C		;6332 90 E8
		rts				;6334 60
L_6335	clc				;6335 18
		lda ZP_D9		;6336 A5 D9
		adc #$F8		;6338 69 F8
		sta ZP_D9		;633A 85 D9
		lda ZP_DA		;633C A5 DA
		adc #$03		;633E 69 03
		sta ZP_DA		;6340 85 DA
		clc				;6342 18
		lda ZP_DB		;6343 A5 DB
		adc #$F8		;6345 69 F8
		sta ZP_DB		;6347 85 DB
		lda ZP_DC		;6349 A5 DC
		adc #$03		;634B 69 03
		sta ZP_DC		;634D 85 DC
		clc				;634F 18
		lda ZP_DD		;6350 A5 DD
		adc #$F8		;6352 69 F8
		sta ZP_DD		;6354 85 DD
		lda ZP_DE		;6356 A5 DE
		adc #$03		;6358 69 03
		sta ZP_DE		;635A 85 DE
		clc				;635C 18
		lda ZP_DF		;635D A5 DF
		adc #$F8		;635F 69 F8
		sta ZP_DF		;6361 85 DF
		lda ZP_E0		;6363 A5 E0
		adc #$03		;6365 69 03
		sta ZP_E0		;6367 85 E0
		clc				;6369 18
		lda ZP_E1		;636A A5 E1
		adc #$F8		;636C 69 F8
		sta ZP_E1		;636E 85 E1
		lda ZP_E2		;6370 A5 E2
		adc #$03		;6372 69 03
		sta ZP_E2		;6374 85 E2
		clc				;6376 18
		lda ZP_E3		;6377 A5 E3
		adc #$F8		;6379 69 F8
		sta ZP_E3		;637B 85 E3
		lda ZP_E4		;637D A5 E4
		adc #$03		;637F 69 03
		sta ZP_E4		;6381 85 E4
		rts				;6383 60
L_6384	lda ZP_14		;6384 A5 14
L_6386	cmp ZP_14		;6386 C5 14
		beq L_6386		;6388 F0 FC
		rts				;638A 60
L_638B	sta wsync		;638B 8D 0A D4
		lda #$0A		;638E A9 0A
		sta colbk		;6390 8D 1A D0
		lda #$00		;6393 A9 00
		sta wsync		;6395 8D 0A D4
		sta colbk		;6398 8D 1A D0
		rts				;639B 60
;super weird stuff:
L_639C		jsr L_6384		;639C 20 84 63
aptr1		ldx #<aptr1 ; $9F		;639F A2 9F
		ldy #>aptr1 ; $63		;63A1 A0 63
		lda ZP_F5		;63A3 A5 F5
		lsr @			;63A5 4A
		bcc L_63AC		;63A6 90 04
aptr2		ldx #<aptr2 ;$A8		;63A8 A2 A8
		ldy #>aptr2 ;$63		;63AA A0 63
L_63AC		stx L_0230		;63AC 8E 30 02
		stx dlistl		;63AF 8E 02 D4
		sty L_0231		;63B2 8C 31 02
		sty dlisth		;63B5 8C 03 D4

		ldx #$00		;63B8 A2 00
		ldy #$F0		;63BA A0 F0
		bcc L_63C0		;63BC 90 02
		ldy #$F0		;63BE A0 F0
L_63C0	stx ZP_F6		;63C0 86 F6
		sty ZP_F7		;63C2 84 F7
		ldy #$F0		;63C4 A0 F0
L_63C5	equ *-1			;!
		bcc L_63CA		;63C6 90 02
		ldy #$F0		;63C8 A0 F0
L_63C9	equ *-1			;!
L_63CA	stx ZP_F8		;63CA 86 F8
		sty ZP_F9		;63CC 84 F9
		ldx #<L_673a ;$3A		;63CE A2 3A
		ldy #>L_673a ;$67		;63D0 A0 67
		bcc L_63D8		;63D2 90 04
		ldx #<L_6833 ;$33		;63D4 A2 33
		ldy #>L_6833 ;$68		;63D6 A0 68
L_63D8	stx ZP_FA		;63D8 86 FA
		sty ZP_FB		;63DA 84 FB
		ldx #$F0		;63DC A2 F0
L_63DD	equ *-1			;!
		bcc L_63E2		;63DE 90 02
		ldx #$F0		;63E0 A2 F0
L_63E1	equ *-1			;!
L_63E2	stx ZP_F3		;63E2 86 F3
		inc ZP_F5		;63E4 E6 F5
		rts				;63E6 60
L_63E7	ldx #$21		;63E7 A2 21
L_63E9	lda ZP_D0,X		;63E9 B5 D0
		sta L_6812,X	;63EB 9D 12 68
		dex				;63EE CA
		bpl L_63E9		;63EF 10 F8
		rts				;63F1 60
L_63F2	ldx #$21		;63F2 A2 21
L_63F4	lda L_6812,X	;63F4 BD 12 68
		sta ZP_D0,X		;63F7 95 D0
		dex				;63F9 CA
		bpl L_63F4		;63FA 10 F8
		rts				;63FC 60
L_63FD	dta $04,$08
L_63FF	dta $A0			;63FF A0   @
L_6400	dta $a4			;6400 A4 $ D
L_6401	dta $A8			;6401 A8 ( H
L_6402	dta $00,$00,$00,$00,$00,$00,$00,$00
L_640A	dta $00,$00,$00,$00,$00,$00,$00,$00
L_6412	dta $A0			;6412 A0   @
L_6413	dta $63,$A2,$63,$A9,$63,$AB,$63,$BF,$63,$BB,$63,$C9,$63,$C5,$63,$00
		dta $00			;6423 00    
L_6424	dta $FF,$3F,$0F,$03
L_6428	dta $06,$04,$00,$01,$03,$07
L_642E	dta $A5			;642E A5 % E
L_642F	dta $62,$9F,$62,$99,$62,$93,$62
L_6436	dta $B5			;6436 B5 5 U
L_6437	dta $62,$E6,$62
;===============================================================================
L_643A	equ $643a
L_653A	equ $653a
L_663A	equ $663a
L_663B	equ $663b    
L_663C	equ $663c
L_66BA	equ $66ba
L_66BB	equ $66bb    
L_66BC	equ $66bc
L_673a	equ $673a
L_674F	equ $674f
L_67E2	equ $67e2			    
L_67E3	equ $67e3
L_67F2	equ $67f2    
L_67F3	equ $67f3
L_6802	equ $6802
L_680A	equ $680a
L_6812	equ $6812
L_6833	equ $6833
L_6848	equ $6848	

	guard $6900
	
		org $6900
;title screen colors
titlecolors	dta $34,$18,$dc,$3c

;winning screen colors
wincolors		dta $66,$78,$cA,$2a

;winning screen displaylists
windl0	dta $F0,$70,$70,$70,$70,$70,$70,$C4,$00,$BC,$C4,$00,$BC,$C4,$20
	dta $BC,$C4,$20,$BC,$C4,$40,$BC,$C4,$40,$BC,$C4,$60,$BC,$C4,$60,$BC
	dta $C4,$80,$BC,$C4,$80,$BC,$C4,$A0,$BC,$C4,$A0,$BC,$C4,$C0,$BC,$C4
	dta $C0,$BC,$C4,$E0,$BC,$C4,$E0,$BC,$41,$13,$69
		
windl1	dta $F0,$70,$70,$70,$70
	dta $70,$70,$C4,$00,$BD,$C4,$00,$BD,$C4,$20,$BD,$C4,$20,$BD,$C4,$40
	dta $BD,$C4,$40,$BD,$C4,$60,$BD,$C4,$60,$BD,$C4,$80,$BD,$C4,$80,$BD
	dta $C4,$A0,$BD,$C4,$A0,$BD,$C4,$C0,$BD,$C4,$C0,$BD,$C4,$E0,$BD,$C4
	dta $E0,$BD,$41,$4D,$69
		
L_6A99	dta $19,$17,$0E,$01,$0D,$14,$1B,$12,$09,$00
L_6AA3	dta $08,$08,$08,$08,$08,$08,$08,$08,$08,$08
L_6AAD	dta $02,$03,$05,$07,$00
L_6AB2	dta $08,$08,$08,$08,$08
L_6AB7	jsr L_6CAF		;6AB7 20 AF 6C
		lda #$81		;6ABA A9 81
		sta ZP_B8		;6ABC 85 B8
		ldx #$09		;6ABE A2 09
		lda #$00		;6AC0 A9 00
L_6AC2	sta L_5E05,X	;6AC2 9D 05 5E
		dex				;6AC5 CA
		bpl L_6AC2		;6AC6 10 FA
L_6AC8	lsr atract		;6AC8 46 4D
		ldx #$09		;6ACA A2 09
		lda ZP_13		;6ACC A5 13
		cmp #$03		;6ACE C9 03
		bcc L_6AD4		;6AD0 90 02
		inc ZP_B8		;6AD2 E6 B8
L_6AD4	clc				;6AD4 18
		lda L_6AA3,X	;6AD5 BD A3 6A
		adc L_6A99,X	;6AD8 7D 99 6A
		bmi L_6AE7		;6ADB 30 0A
		cmp #$20		;6ADD C9 20
		bcs L_6AF3		;6ADF B0 12
		sta L_6A99,X	;6AE1 9D 99 6A
		jmp L_6AFE		;6AE4 4C FE 6A
L_6AE7	and #$07		;6AE7 29 07
		sta L_6A99,X	;6AE9 9D 99 6A
		lda #$08		;6AEC A9 08
		sta L_6AA3,X	;6AEE 9D A3 6A
		bne L_6AFE		;6AF1 D0 0B
L_6AF3	sec				;6AF3 38
		sbc #$10		;6AF4 E9 10
		sta L_6A99,X	;6AF6 9D 99 6A
		lda #$F8		;6AF9 A9 F8
		sta L_6AA3,X	;6AFB 9D A3 6A
L_6AFE	lda L_6A99,X	;6AFE BD 99 6A
		sta L_5DC6,X	;6B01 9D C6 5D
		txa				;6B04 8A
		asl @			;6B05 0A
		asl @			;6B06 0A
		clc				;6B07 18
		adc #$CA		;6B08 69 CA
		clc				;6B0A 18
		adc ZP_B8		;6B0B 65 B8
		asl @			;6B0D 0A
		tay				;6B0E A8
		txa				;6B0F 8A
		clc				;6B10 18
		adc #$A7		;6B11 69 A7
		sec				;6B13 38
		sbc ZP_B8		;6B14 E5 B8
		eor #$FF		;6B16 49 FF
		asl @			;6B18 0A
		clc				;6B19 18
		adc sine_table,Y	;6B1A 79 C3 75
		tay				;6B1D A8
		lda sine_table,Y	;6B1E B9 C3 75
		clc				;6B21 18
		adc #$80		;6B22 69 80
		lsr @			;6B24 4A
		lsr @			;6B25 4A
		clc				;6B26 18
		adc #$28		;6B27 69 28
		sta L_5DF0,X	;6B29 9D F0 5D
		txa				;6B2C 8A
		asl @			;6B2D 0A
		clc				;6B2E 18
		adc ZP_B8		;6B2F 65 B8
		asl @			;6B31 0A
		sec				;6B32 38
		sbc ZP_B8		;6B33 E5 B8
		tay				;6B35 A8
		txa				;6B36 8A
		asl @			;6B37 0A
		adc ZP_B8		;6B38 65 B8
		asl @			;6B3A 0A
		adc #$A9		;6B3B 69 A9
		adc sine_table,Y	;6B3D 79 C3 75
		eor #$FF		;6B40 49 FF
		tay				;6B42 A8
		lda sine_table,Y	;6B43 B9 C3 75
		clc				;6B46 18
		adc #$80		;6B47 69 80
		lsr @			;6B49 4A
		clc				;6B4A 18
		adc #$00		;6B4B 69 00
		sta L_5DDB,X	;6B4D 9D DB 5D
		cmp #$41		;6B50 C9 41
		bne L_6B5C		;6B52 D0 08
		lda L_5E05,X	;6B54 BD 05 5E
		eor #$01		;6B57 49 01
		sta L_5E05,X	;6B59 9D 05 5E
L_6B5C	dex				;6B5C CA
		bmi L_6B62		;6B5D 30 03
		jmp L_6AD4		;6B5F 4C D4 6A
L_6B62	jsr L_5DC0		;6B62 20 C0 5D
		;jsr L_6C4C		;6B65 20 4C 6C
		lda ZP_13		;6B68 A5 13
		bne L_6B6F		;6B6A D0 03
		jmp L_6AC8		;6B6C 4C C8 6A
L_6B6F		lda consol		;6B6F AD 1F D0
		and trig0		;6B72 2D 10 D0
		and trig1		;6B75 2D 11 D0
		beq L_6B7D_new_game		;6B78 F0 03
		jmp select
	
L_6B7D_new_game	lda #$05		;6B7D A9 05
		sta ZP_AD_lives		;6B7F 85 AD
		lda #C_STARTING_LEVEL		;6B81 A9 00
		sta ZP_AE_level		;6B83 85 AE
		sta sdmctl		;6B85 8D 2F 02
		mva #$ff ZP_B6_disks_to_collect
		sta ZP_B7_lenses_to_destroy
		jsr L_9400_game		;6B88 20 00 94
		pla				;6B8B 68
		pla				;6B8C 68
		bcc L_6B92		;6B8D 90 03
		jmp L_6AB7		;6B8F 4C B7 6A
L_6B92	jsr winning_screen		;6B92 20 F1 6D
L_6B95	lsr atract		;6B95 46 4D
		ldx #$04		;6B97 A2 04
		inc ZP_B8		;6B99 E6 B8
L_6B9B	lda ZP_B8		;6B9B A5 B8
		and #$01		;6B9D 29 01
		bne L_6BD5		;6B9F D0 34
		lda random		;6BA1 AD 0A D2
		and #$C0		;6BA4 29 C0
		ora #$01		;6BA6 09 01
		sta L_5E05,X	;6BA8 9D 05 5E
		clc				;6BAB 18
		lda L_6AB2,X	;6BAC BD B2 6A
		adc L_6AAD,X	;6BAF 7D AD 6A
		bmi L_6BBE		;6BB2 30 0A
		cmp #$20		;6BB4 C9 20
		bcs L_6BCA		;6BB6 B0 12
		sta L_6AAD,X	;6BB8 9D AD 6A
		jmp L_6BD5		;6BBB 4C D5 6B
L_6BBE	and #$07		;6BBE 29 07
		sta L_6AAD,X	;6BC0 9D AD 6A
		lda #$08		;6BC3 A9 08
		sta L_6AB2,X	;6BC5 9D B2 6A
		bne L_6BD5		;6BC8 D0 0B
L_6BCA	sec				;6BCA 38
		sbc #$10		;6BCB E9 10
		sta L_6AAD,X	;6BCD 9D AD 6A
		lda #$F8		;6BD0 A9 F8
		sta L_6AB2,X	;6BD2 9D B2 6A
L_6BD5	lda L_6AAD,X	;6BD5 BD AD 6A
		sta L_5DC6,X	;6BD8 9D C6 5D
		txa				;6BDB 8A
		asl @			;6BDC 0A
		asl @			;6BDD 0A
		clc				;6BDE 18
		adc #$7B		;6BDF 69 7B
		clc				;6BE1 18
		adc ZP_B8		;6BE2 65 B8
		asl @			;6BE4 0A
		tay				;6BE5 A8
		txa				;6BE6 8A
		clc				;6BE7 18
		adc #$6F		;6BE8 69 6F
		sec				;6BEA 38
		sbc ZP_B8		;6BEB E5 B8
		eor #$FF		;6BED 49 FF
		asl @			;6BEF 0A
		clc				;6BF0 18
		adc sine_table,Y	;6BF1 79 C3 75
		tay				;6BF4 A8
		lda sine_table,Y	;6BF5 B9 C3 75
		clc				;6BF8 18
		adc #$80		;6BF9 69 80
		lsr @			;6BFB 4A
		lsr @			;6BFC 4A
		clc				;6BFD 18
		adc #$28		;6BFE 69 28
		sta L_5DF0,X	;6C00 9D F0 5D
		txa				;6C03 8A
		asl @			;6C04 0A
		clc				;6C05 18
		adc ZP_B8		;6C06 65 B8
		asl @			;6C08 0A
		sec				;6C09 38
		sbc ZP_B8		;6C0A E5 B8
		tay				;6C0C A8
		txa				;6C0D 8A
		asl @			;6C0E 0A
		adc ZP_B8		;6C0F 65 B8
		asl @			;6C11 0A
		adc #$EA		;6C12 69 EA
		adc sine_table,Y	;6C14 79 C3 75
		eor #$FF		;6C17 49 FF
		tay				;6C19 A8
		lda sine_table,Y	;6C1A B9 C3 75
		clc				;6C1D 18
		adc #$80		;6C1E 69 80
		lsr @			;6C20 4A
		clc				;6C21 18
		adc #$00		;6C22 69 00
		sta L_5DDB,X	;6C24 9D DB 5D
		dex				;6C27 CA
		bmi L_6C2D		;6C28 30 03
		jmp L_6B9B		;6C2A 4C 9B 6B
L_6C2D	jsr L_5DC0		;6C2D 20 C0 5D
		lda ZP_13		;6C30 A5 13
		bne L_6C37		;6C32 D0 03
		jmp L_6B95		;6C34 4C 95 6B
L_6C37	lda ZP_11		;6C37 A5 11
		bpl L_6C49		;6C39 10 0E
		lda consol		;6C3B AD 1F D0
		and trig0		;6C3E 2D 10 D0
		and trig1		;6C41 2D 11 D0
		beq L_6C49		;6C44 F0 03
		jmp L_6B95		;6C46 4C 95 6B
L_6C49	jmp L_6AB7		;6C49 4C B7 6A

L_6CAF		lda #$01	
		sta sdmctl	
		mva #<titledli.start tptr1
		mva #>titledli.start tptr2
	

;prepare vram data for title screen:
L_6CEF	jsr hide_pmg		;6CEF 20 51 6F
		lda #>title_bgfont1		;6CF2 A9 56
		sta L_6D16		;6CF4 8D 16 6D
		lda #$AE		;6CF7 A9 AE
		sta L_6D19		;6CF9 8D 19 6D
		lda #$B6		;6CFC A9 B6
		sta L_6D1C		;6CFE 8D 1C 6D
		lda #>title_bgfont2		;6D01 A9 5A
		sta L_6D1F		;6D03 8D 1F 6D
		lda #$B2		;6D06 A9 B2
		sta L_6D22		;6D08 8D 22 6D
		lda #$BA		;6D0B A9 BA
		sta L_6D25		;6D0D 8D 25 6D
		ldy #$01		;6D10 A0 01
L_6D12		ldx #$00		;6D12 A2 00
L_6D14		lda title_bgfont1,X	;6D14 BD 00 56
L_6D16	equ *-1			;!
		sta L_AE00,X	;6D17 9D 00 AE
L_6D19	equ *-1			;!
		sta L_B600_player2_data,X	;6D1A 9D 00 B6
L_6D1C	equ *-1			;!
		lda title_bgfont2,X	;6D1D BD 00 5A
L_6D1F	equ *-1			;!
		sta L_B200,X	;6D20 9D 00 B2
L_6D22	equ *-1			;!
		sta L_BA00,X	;6D23 9D 00 BA
L_6D25	equ *-1			;!
		inx				;6D26 E8
		bne L_6D14		;6D27 D0 EB
		inc L_6D16		;6D29 EE 16 6D
		inc L_6D19		;6D2C EE 19 6D
		inc L_6D1C		;6D2F EE 1C 6D
		inc L_6D1F		;6D32 EE 1F 6D
		inc L_6D22		;6D35 EE 22 6D
		inc L_6D25		;6D38 EE 25 6D
		dey				;6D3B 88
		bpl L_6D12		;6D3C 10 D4
		iny				;6D3E C8
		sty ZP_BA		;6D3F 84 BA
		tya				;6D41 98
		ldx #$03		;6D42 A2 03
L_6D44	sta L_02C0,X	;6D44 9D C0 02
		dex				;6D47 CA
		bpl L_6D44		;6D48 10 FA
		lda #$07		;6D4A A9 07
		sta ZP_B9		;6D4C 85 B9
	
		mva #0 rmt.ingamesonglines ;reset ingame music to 0
		lda #$0		;6D52 A9 70
		rmt.initshort
		ldx #$00		;6D5D A2 00
L_6D5F	sec				;6D5F 38
		lda #$00		;6D60 A9 00
		sbc sine_table,X	;6D62 FD C3 75
		sta sine_table2,X	;6D65 9D 43 76
		inx				;6D68 E8
		bpl L_6D5F		;6D69 10 F4
		ldx #$00		;6D6B A2 00
L_6D6D	txa				;6D6D 8A
		lsr @			;6D6E 4A
		tay				;6D6F A8
		lda titlescreen_default_field,Y	;6D70 B9 7F 6F
		bne L_6D78		;6D73 D0 03
		lda #$7D		;6D75 A9 7D
		clc				;6D77 18
L_6D78	adc #$00		;6D78 69 00
		sta L_BC00,X	;6D7A 9D 00 BC
		sta L_BD00,X	;6D7D 9D 00 BD
		inx				;6D80 E8
		bne L_6D6D		;6D81 D0 EA
		txa				;6D83 8A
		ldx #$03		;6D8A A2 03
L_6D8C	lda #$03		;6D8C A9 03
		sta sizep0,X	;6D8E 9D 08 D0
		lda L_6FFF,X	;6D91 BD FF 6F
		sta hposp0,X	;6D94 9D 00 D0
		dex				;6D97 CA
		bpl L_6D8C		;6D98 10 F2
		lda #$31		;6D9A A9 31
		sta gprior		;6D9C 8D 6F 02
		lda #$03		;6D9F A9 03
		sta gractl		;6DA1 8D 1D D0
		lda #$BC		;6DA4 A9 BC
		sta pmbase		;6DA6 8D 07 D4
		ldx #$00		;6DA9 A2 00
		txa				;6DAB 8A
L_6DAC	sta L_BE00,X	;6DAC 9D 00 BE
		sta L_BF00,X	;6DAF 9D 00 BF
		inx				;6DB2 E8
		bne L_6DAC		;6DB3 D0 F7
		ldx #$03		;6DB5 A2 03
		lda #$FF		;6DB7 A9 FF
L_6DB9	sta L_BE6E,X	;6DB9 9D 6E BE
		sta L_BEEE,X	;6DBC 9D EE BE
		sta L_BF6E,X	;6DBF 9D 6E BF
		sta L_BFEE,X	;6DC2 9D EE BF
		dex				;6DC5 CA
		bpl L_6DB9		;6DC6 10 F1
		ldx #<title_init_animation_data
		ldy #>title_init_animation_data
		jsr init_animation		;6DCC 20 C3 5D
		jsr pauseframe		;6DCF 20 90 6E
		mwa #titledli.start L_0200
		
		lda #$2D

L_6DDE		ldx #<titlevbi
		stx L_0222
		ldx #>titlevbi
		stx L_0223
enable_interrupts	ldx #$C0		;6DE8 A2 C0
		stx nmien		;6DEA 8E 0E D4
		sta sdmctl		;6DED 8D 2F 02
		rts				;6DF0 60
		
;winning screen CODE:
.local 	winning_screen
		mva #0 ZP_30_ingame_music_on
		jsr hide_pmg

;clear 18 pages from $ac00		
		mwa #$ac00 ZP_86
		ldx #$12		
		ldy #$00		
		tya				
x1		sta (ZP_86),Y	
		iny			
		bne x1
		inc ZP_87	
		dex			
		bne x1
				
;copy half of font (text chars) to fonts at $ac00, $b400
		lda #>L_9000_scroll_font
		sta ptr1	
		lda #$AC	
		sta ptr2
		lda #$B4	
		sta ptr3	
		
		ldy #$01	
x2		ldx #$00	
x3		lda L_9000_scroll_font,X	
ptr1	equ *-1			
		sta $AC00,X	
ptr2	equ *-1		
		sta $B400,X	
ptr3	equ *-1		
		inx			
		bne x3		
		inc ptr1		
		inc ptr2		
		inc ptr3	
		dey			
		bpl x2	
		
;winning tune
		lda #$65	
		rmt.initshort
		
;display text
		ldy #$00		;6E3D A0 00
		ldx #$00		;6E3F A2 00
L_6E41		lda wintext,X	;6E41 BD FF 74
		php				;6E44 08
		inx				;6E45 E8
		plp				;6E46 28
		bpl L_6E5B		;6E47 10 12
		cmp #$9a		;6E49 C9 9A
		bcs L_6E5B		;6E4B B0 0E
		stx ZP_A4		;6E4D 86 A4
		and #$0F		;6E4F 29 0F
		tax				;6E51 AA
L_6E52		iny				;6E52 C8
		dex				;6E53 CA
		bne L_6E52		;6E54 D0 FC
		ldx ZP_A4		;6E56 A6 A4
		jmp L_6E41		;6E58 4C 41 6E
L_6E5B		cmp #$40		;6E5B C9 40
		bne L_6E69		;6E5D D0 0A
		clc				;6E5F 18
		tya				;6E60 98
		and #$E0		;6E61 29 E0
		adc #$20		;6E63 69 20
		tay				;6E65 A8
		jmp L_6E41		;6E66 4C 41 6E
L_6E69		cmp #$5B		;6E69 C9 5B
		beq L_6E77		;6E6B F0 0A
		sta L_BC00,Y	;6E6D 99 00 BC
		sta L_BD00,Y	;6E70 99 00 BD
		iny				;6E73 C8
		jmp L_6E41		;6E74 4C 41 6E
L_6E77		ldx #<win_init_animation_data
		ldy #>win_init_animation_data
		jsr init_animation		;6E7B 20 C3 5D
		
		mwa #winning_dli L_0200
		mwa #winvbi L_0222
		
		lda #$21		
		jmp enable_interrupts
		
.endl

pauseframe	pause 0
		rts
								;6E96 60
;winning screen DLI
winning_dli	phr ;pha				;6E97 48
		cld				;6E98 D8
		mva #1 prior
		lda vcount		;6E99 AD 0B D4
		cmp #$08		;6E9C C9 08
		bcs L_6EBC		;6E9E B0 1C
:4		mva wincolors+:1 colpf0+:1
		rmt.rmt_play_unisystem
		
		lda #$00		;6EB8 A9 00
		sta ZP_F4		;6EBA 85 F4
L_6EBC		inc ZP_F4		;6EBC E6 F4
		lda ZP_F4		;6EBE A5 F4
		lsr @			;6EC0 4A
		lda ZP_F3		;6EC1 A5 F3
		bcs L_6EC7		;6EC3 B0 02
		adc #$04		;6EC5 69 04
L_6EC7		sta chbase		;6EC7 8D 09 D4
		plr ;pla				;6ECA 68
		rti				;6ECB 40

;title screen VBI
titlevbi
		lda #<titledli.start
tptr1	equ *-1
		sta L_0200
		lda #>titledli.start
tptr2	equ *-1
		sta L_0200+1

winvbi
		jmp $e45f	;SYSVBV vector 
		
hide_pmg		ldx #$07	
		lda #$00	
L_6F55		sta hposp0,X	
		dex			
		bpl L_6F55	
		stx ZP_11
		inx
		stx ZP_13		
		stx ZP_14	
		rts		

title_init_animation_data
	dta b(>titlefont)	;charset with letter sprites
	dta $0a	;number of sprites (letters)
	dta $02	;starting char for animated(shifted) objects in font
	dta $20	;how many chars horizontally is animation drawn (clipping)
	dta $08	;how many tiles (2chars) vertically is animation drawn (clipping)
	dta $20	;width of screen
	dta a(titledl0,titledl1)
	dta $BC	;#> of field - front
	dta $BD	;#> of field - back
	dta $AC	;#> of font1
	dta $B4	;#> of font2

win_init_animation_data	
	dta b(>titlefont),$05,$40,$20,$08,$20
	dta a(windl0,windl1) 
	dta $BC,$BD,$AC,$B4
		
titlescreen_default_field
	dta $FE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$FE
	dta $DC,$00,$56,$00,$56,$00,$56,$00,$56,$00,$56,$00,$56,$00,$56,$DC
	dta $DC,$5A,$58,$5A,$58,$5A,$64,$66,$58,$5A,$58,$5A,$58,$5A,$58,$DC
	dta $DC,$00,$40,$42,$44,$46,$68,$6A,$48,$4A,$56,$00,$56,$00,$56,$DC
	dta $DC,$54,$60,$62,$58,$5A,$58,$5A,$58,$4C,$4E,$6C,$6E,$5A,$58,$DC
	dta $DC,$78,$7A,$7C,$56,$00,$56,$00,$56,$00,$50,$52,$70,$00,$56,$DC
	dta $DC,$5A,$58,$5A,$58,$5A,$58,$5A,$58,$5A,$74,$76,$72,$5A,$58,$DC
	dta $FE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$DE,$FE
L_6FFF	dta $40
;$7000 - scroll text 
;after scroll text, there is text of winner screen

.macro	dtax ' '
	dta $dc,$dd
	dta :1
	dta $dc,$dd
.endm

		guard $7000
		org $7000

text		
:12		dtax d'                            '	
		dtax d'       LASERMANIA 2020      '*
		dtax d'                            '		
		dtax d'                            '
		dtax d'                            '
		dtax d'                            '
		dtax d'ORIGINAL GAME BY AVALON 1990'
		dtax d'                            '
		dtax d'  CODE: ',d'MIROSLAW LIMINOWICZ '*
		dtax d'   MSX: ',d'DANIEL KLECZYNSKI   '*
		dtax d'        ',d'JANUSZ PELC         '*
		dtax d'   GFX: ',d'JANUSZ PELC         '*
		dtax d'        ',d'MAREK SIEWIOR       '*
		dtax d'                            '
		dtax d'                            '
		dtax d'   2020 REVAMPED VERSION    '
		dtax d'                            '
		dtax d'  CODE: ',d'MARTIN SIMECEK      '*
		dtax d'   MSX: ',d'ZDENEK EISENHAMMER  '*
		dtax d'   GFX: ',d'ZDENEK EISENHAMMER  '*
		dtax d'        ',d'MARTIN SIMECEK      '*
		dtax d'                            '
		dtax d' HTTP://MATOSIMI.ATARI.ORG  '
		dtax d'                            '
		dtax d'                            '
		dtax d'  STRICTLY CONFIDENTIAL!    '*
		dtax d'                            '
		dtax d'30 YEARS HAVE PASSED SINCE  '
		dtax d'THE ',d'LIMES'*,d' PROJECT STARTED,  '
		dtax d'YET ONLY VERY FEW AGENTS    '
		dtax d'WERE ABLE TO SUCCEED.       '
		dtax d'                            '
		dtax d'NOW THE PROJECT IS REOPENED,'
		dtax d'REDESIGNED AND READY FOR NEW'
		dtax d'AGENTS TO EXECUTE THE ORDER:'
		dtax d'                            '
		dtax d'1.'*,d' USING JOYSTICK, CURSOR   '
		dtax d'KEYS OR ',d'WASD'*,d' TAKE CONTROL   '
		dtax d'OVER REMOTELY CONTROLLED,   '
		dtax d'SELF-PROPELLING K9 CRAWLER  '
		dtax d'DRONE.                      '
		dtax d'                            '
		dtax d'2.'*,d' COLLECT RANDOMLY PLACED  '
		dtax d'MEMORY CAPSULES, DIRECTING  '
		dtax d'THE VEHICLE FROM THE XL/XE  '
		dtax d'DISPOSAL CENTER.            '
		dtax d'                            '
		dtax d'3.'*,d' DESTROY ALARM SENSORS    '
		dtax d'USING LASER BEAM.           '
		dtax d'                            '
		dtax d'4.'*,d' REMEMBER TO LET EVERYONE '
		dtax d'KNOW YOU REACHED PAST THE   '
		dtax d'LAST ROOM AND FULFILLED THE '
		dtax d'ORDER.                      '
		dtax d'                            '
		dtax d'5.'*,d' IN CASE OF IMPASSE, PRESS'
		dtax d'THE ',d'ESC'*,d' KEY.                '
		dtax d'                            '
		dtax d'6.'*,d' PRESS ',d'M / CONTROL+M'*,d' TO   '
		dtax d'SWITCH AUDIO OFF AND ON.    '
		dtax d'                            '
		dtax d'7.'*,d' GIVE A PARTICULAR        '
		dtax d'ATTENTION TO:               '
		dtax d'                            '
		dtax 0,$c6,$c7,d' MEMORY CAPSULES         '
		dtax 0,$e6,$e7,d'                         '
		dtax d'                            '
		dtax 0,$d6,$d7,d' ALARM SENSORS           '
		dtax 0,$f6,$f7,d'                         '
		dtax d'                            '
		dtax 0,$c8,$c9,d' LASER SWITCHES          '
		dtax 0,$e8,$e9,d'                         '
		dtax d'                            '
		dtax 0,$c2,$c3,d' ELECTRONIC DOORS        '
		dtax 0,$e2,$e3,d'                         '
		dtax d'                            '
		dtax 0,$ca,$cb,d' DOOR LOCK CONTROLLERS   '
		dtax 0,$ea,$eb,d'                         '
		dtax d'                            '
		dtax 0,$d8,$d9,d' LEVEL GATES             '
		dtax 0,$f8,$f9,d'                         '
		dtax d'                            '
		dtax 0,$c4,$c5,d' REFLECTIVE BLOCKS       '
		dtax 0,$e4,$e5,d'                         '
		dtax d'                            '
		dtax 0,$d2,$d3,d' LASER BOMBS             '
		dtax 0,$f2,$f3,d'                         '
		dtax d'                            '
		dtax 0,$ce,$cf,d' TEMPORARY BEAM BREAKERS '
		dtax 0,$ee,$ef,d'                         '
		dtax d'                            '
		dtax 0,$cc,$cd,d' AIM CONTROLLERS         '
		dtax 0,$ec,$ed,d'                         '		
		dtax d'                            '
		dtax 0,$d0,$d1,d' BEAM RELAYS             '
		dtax 0,$f0,$f1,d'                         '
		dtax d'                            '		dtax d'                            '
		dtax d'                            '		
		dtax d'                            '
		dtax d'        GOOD LUCK!          '
		dtax d'                            '
		dtax d'                            '
		dtax d'                            '		
		dtax d'                            '
		dtax d'                            '
		dtax d'                            '		
		dtax d'                            '
		dtax d'                            '
		dtax d'                            '
		dtax d'                            '		
		dtax d'                            '
		dtax d'                            '
		dtax d'                            '		
		
		
;winning screen text:
wintext		dta $98	
		dta d"CONGRATULATIONS\"*,$40,$40
		dta d"YOU HAVE SUCCEEDED TO EXECUTE",$40
		dta d"THE ORDER.",$40,$40
		dta d"THANK YOU AGENT, WE ARE PROUD",$40
		dta d"YOU ARE KEEPING THIS PROJECT",$40
		dta d"STILL ALIVE..."
		dta $5b


		
sine_table	dta $00,$03,$06,$09,$0C,$0F,$12,$15,$18,$1B,$1E,$21,$24,$27,$2A,$2D
		dta $30,$33,$36,$39,$3B,$3E,$41,$43,$46,$49,$4B,$4E,$50,$52,$55,$57
		dta $59,$5B,$5E,$60,$62,$64,$66,$67,$69,$6B,$6C,$6E,$70,$71,$72,$74
		dta $75,$76,$77,$78,$79,$7A,$7B,$7B,$7C,$7D,$7D,$7E,$7E,$7E,$7E,$7E
		dta $7F,$7E,$7E,$7E,$7E,$7E,$7D,$7D,$7C,$7B,$7B,$7A,$79,$78,$77,$76
		dta $75,$74,$72,$71,$70,$6E,$6C,$6B,$69,$67,$66,$64,$62,$60,$5E,$5B
		dta $59,$57,$55,$52,$50,$4E,$4B,$49,$46,$43,$41,$3E,$3B,$39,$36,$33
		dta $30,$2D,$2A,$27,$24,$21,$1E,$1B,$18,$15,$12,$0F,$0C,$09,$06,$03
sine_table2	;keep half page space for this
		guard sine_table+256

		org (*/$400)*$400+$400	;org aligned to $400
		
;orig.8400 - statusbar font ... to 8600 (L200)
statusfont	ins 'status_gfx\8400_statusbar_pg.fnt',0,$200

;orig.8700-8900 tank Player data
tank_pmdata	ins "buld-p0.dat"
		ins "buld-p1.dat"

;:256		dta 0


.local		rmt
player		equ $8900+$400
		icl "msx\rmtplayr.a65"

;requires songline in A		
.proc		initshort
		mvx #$01 do_silence ;disable silence
		ldx #<msx
		ldy #>msx
		jmp rmt.rmt_init
.endp

.proc		initingame
		cpx ingamesonglines ;check if the correct music already plays
		beq x0
		stx ingamesonglines
		lda ingamesonglines,x
		jmp initshort
x0		rts
.endp

;play same independently on the video system (PAL/NTSC)
.proc		rmt_play_unisystem
		lda pal
		beq vbpal
		inc ntsctimer
		lda ntsctimer
		cmp #6
		bne vbpal
		mva #255 ntsctimer
		jmp vbntsc
		
vbpal		jsr rmt.rmt_play 
vbntsc		rts
.endp

ingamesonglines	dta 0 ;current tune
		dta $39,$49

.endl

.print "end of rmt player: ", *


L_9400_game	jmp L_9430_game		;9400 4C 30 94
L_9403		jmp L_9D3A_set_vramline_backbuffer		;9403 4C 3A 9D
		
stop_music	jsr L_9B11_stop_music		;942B 20 11 9B
		clc				;942E 18
		rts				;942F 60

		

;gameplay code starts here:
L_9430_game	jsr L_9A05_game_init		;9430 20 05 9A
		jsr L_9720_next_level_animation		;9433 20 20 97

L_9436_gameloop	lda ZP_11		;9436 A5 11
L_9438		beq L_944C		;9438 F0 12

;replaced control - control now runs in VBI and here just the results are evaluated
		jsr control2.update
		
		lda ZP_A9		;943D A5 A9
		bmi check_cheat		;943F 30 10
		sed				;9441 F8
		sec				;9442 38
		lda ZP_AD_lives		;9443 A5 AD
		sbc #$01		;9445 E9 01
		cld				;9447 D8
		sta ZP_AD_lives		;9448 85 AD
		bne L_9482		;944A D0 36
L_944C		jsr L_9B11_stop_music		;944C 20 11 9B
		sec				;944F 38
		rts				;9450 60

;cheat: START+OPTION+CTRL+N to go to next level
;it is not possible to perform this on some PC keyboards (not reading that many keys at once)		
check_cheat
		lda skstat		;9451 AD 0F D2
		cmp #$FB		;9454 C9 FB
		bne L_9468		;9456 D0 10
		lda consol		;9458 AD 1F D0
		eor #$02		;945B 49 02
		bne L_9468		;945D D0 09
		lda kbcode		;945F AD 09 D2
		cmp #C_KEY_CTRL_N		;9462 C9 A3
		bne L_9468		;9464 D0 02
		sta ZP_AC		;9466 85 AC
L_9468		ldx ZP_AC		;9468 A6 AC
		beq L_9489		;946A F0 1D
		sed				;946C F8
		clc				;946D 18
;next level stuff:
		lda ZP_AE_level		;946E A5 AE
		adc #$01		;9470 69 01
		cmp #$53		;9472 C9 53
		cld				;9474 D8
		beq stop_music		;9475 F0 B4
		sta ZP_AE_level		;9477 85 AE
		sed				;9479 F8
		clc				;947A 18
		lda ZP_AD_lives		;947B A5 AD
		adc #$01		;947D 69 01
		sta ZP_AD_lives		;947F 85 AD
		cld				;9481 D8
L_9482		jsr L_9720_next_level_animation		;9482 20 20 97
		lda #$00		;9485 A9 00
		sta ZP_AC		;9487 85 AC
L_9489		jsr run_laser

L_948C		lda ZP_14		;948C A5 14
		and #$04		;948E 29 04
		beq L_948C		;9490 F0 FA
		update_statusbar_values		;9492 20 F5 9D
		jsr L_A1BE_update_playfield
		jsr L_968C_update_playfield2		;9498 20 8C 96
		
		lsr atract		;949B 46 4D
L_949D	lda ZP_14		;949D A5 14
		and #$04		;949F 29 04
		bne L_949D		;94A1 D0 FA
		jmp L_9436_gameloop		;94A3 4C 36 94
L_94A6	dta $11			;94A6 11   1 ; !!! ORA (ZP_A2),Y
L_94A7	ldx #$00		;94A7 A2 00
		lda beam_data		;94A9 AD 00 9F
		lsr @			;94AC 4A
		sta ZP_89		;94AD 85 89
		rol @			;94AF 2A
		asl @			;94B0 0A
		rol @			;94B1 2A
		tay				;94B2 A8
		sta ZP_88		;94B3 85 88
		asl @			;94B5 0A
		asl @			;94B6 0A
		asl @			;94B7 0A
		asl @			;94B8 0A
		ora ZP_89		;94B9 05 89
		adc L_9F6A		;94BB 6D 6A 9F
		sta ZP_89		;94BE 85 89
		lda (ZP_88,X)	;94C0 A1 88
		eor ZP_00,Y		;94C2 59 00 00
		sta ZP_BC		;94C5 85 BC
		ldy ZP_A6		;94C7 A4 A6
		cpy #$FF		;94C9 C0 FF
		bne L_94CE		;94CB D0 01
		rts				;94CD 60
L_94CE	sty ZP_95		;94CE 84 95
		lda #$00		;94D0 A9 00
		sta ZP_AB		;94D2 85 AB
		ldx #$80		;94D4 A2 80
		lda direction		;94D6 AD F6 9E
		lsr @			;94D9 4A
		bcs L_94DE		;94DA B0 02
		ldx #$02		;94DC A2 02
L_94DE	lsr @			;94DE 4A
		bcs L_94E3		;94DF B0 02
		ldx #$03		;94E1 A2 03
L_94E3	lsr @			;94E3 4A
		bcs L_94E8		;94E4 B0 02
		ldx #$01		;94E6 A2 01
L_94E8	lsr @			;94E8 4A
		bcs L_94ED		;94E9 B0 02
		ldx #$00		;94EB A2 00
L_94ED	txa				;94ED 8A
		bpl player_move		;94EE 10 02
		sec				;94F0 38
		rts				;94F1 60

player_move	jsr control2.clear
		
		tax
;selects movement routine from lookuptable and saves the pointer below ;94F5 AA
		lda movement_routines,X	;94F6 BD 42 9F
		sta L_9504		;94F9 8D 04 95
		lda movement_routines+1,X	;94FC BD 43 9F
		sta L_9505		;94FF 8D 05 95
		tya
;dynamically jump to movement routine based on direction	;9502 98
L_9503	jsr L_9503		;9503 20 03 95
L_9504	equ *-2			;!
L_9505	equ *-1			;!
		bcs L_955D		;9506 B0 55
		lda L_AF00_playfield,Y	;9508 B9 00 AF
;$34 - exit:  
;bx "pc=$9515 and a=$34"
;$0d - non moving stone
;$23 - laser door opened by trigger
		bne L_9515		;950B D0 08
L_950D		sty ZP_9A		;950D 84 9A
		lda #$00		;950F A9 00
		sta ZP_98		;9511 85 98
;this means the block is not being pushed by tank
		clc				;9513 18
		rts				;9514 60
;laser door:
L_9515		cmp #$23		;9515 C9 23
		bne L_9529		;9517 D0 10
		pha				;9519 48
		ora #$80		;951A 09 80
		sta L_AF00_playfield,Y	;951C 99 00 AF
		tya				;951F 98
		pha				;9520 48
		nop ;tya				;9521 98
		tax				;9522 AA
		jsr door_pushed		;9523 20 06 A0
		pla				;9526 68
		tay				;9527 A8
		pla				;9528 68
;clearing 2 top bits
L_9529	and #$3F		;9529 29 3F
		tax				;952B AA
		lda element_types,X	;952C BD 00 5D
		tax				;952F AA
		and #$10		;9530 29 10
		bne L_950D		;9532 D0 D9
		txa				;9534 8A
		and #$08		;9535 29 08
		beq L_9548		;9537 F0 0F
		dec ZP_B6_disks_to_collect		;9539 C6 B6
		lda #$FF		;953B A9 FF
		sta ZP_B2		;953D 85 B2
		sta ZP_B3		;953F 85 B3
		lda #$00		;9541 A9 00
		sta L_AF00_playfield,Y	;9543 99 00 AF
		beq L_950D		;9546 F0 C5
L_9548	txa				;9548 8A
		and #$20		;9549 29 20
		beq L_9559		;954B F0 0C
	
		lda #$FF		;9551 A9 FF
		sta ZP_AC		;9553 85 AC
		sta ZP_BB		;9555 85 BB
		bne L_950D		;9557 D0 B4
L_9559	txa				;9559 8A
		asl @			;955A 0A
		bmi L_9563		;955B 30 06
L_955D	lda #$80		;955D A9 80
		sta ZP_AB		;955F 85 AB
		sec				;9561 38
		rts				;9562 60
L_9563	sty ZP_95		;9563 84 95
		lda ZP_96		;9565 A5 96
		asl @			;9567 0A
		tax				;9568 AA
		lda movement_routines,X	;9569 BD 42 9F
		sta L_9577		;956C 8D 77 95
		lda movement_routines+1,X	;956F BD 43 9F
		sta L_9578		;9572 8D 78 95
		tya				;9575 98
L_9576	jsr L_9576		;9576 20 76 95
L_9577	equ *-2			;!
L_9578	equ *-1			;!
		bcs L_955D		;9579 B0 E2
		lda L_AF00_playfield,Y	;957B B9 00 AF
		bne L_955D		;957E D0 DD
		lda #$01		;9580 A9 01
		sta ZP_98		;9582 85 98
		ldx ZP_95		;9584 A6 95
		lda L_AF00_playfield,X	;9586 BD 00 AF
		pha				;9589 48
		sta L_AF00_playfield,Y	;958A 99 00 AF
		tya				;958D 98
		pha				;958E 48
		lda #$00		;958F A9 00
		sta L_AF00_playfield,X	;9591 9D 00 AF
		stx ZP_9A		;9594 86 9A
		sty ZP_A2		;9596 84 A2
		lda ZP_95		;9598 A5 95
		jsr L_9D52_set_vramline_frontbuffer		;959A 20 52 9D
		lda #$00	;959D A9 00
		jsr L_96D1_draw_tile_ingame		;959F 20 D1 96
		lda ZP_95		;95A2 A5 95
		jsr L_9D3A_set_vramline_backbuffer		;95A4 20 3A 9D
		lda #$00		;95A7 A9 00
		jsr L_96D1_draw_tile_ingame		;95A9 20 D1 96
		pla				;95AC 68
		jsr L_9D3A_set_vramline_backbuffer		;95AD 20 3A 9D
		pla				;95B0 68
		jsr L_96D1_draw_tile_ingame		;95B1 20 D1 96
		sty ZP_A3		;95B4 84 A3
		lda #$00		;95B6 A9 00
		sta ZP_A4		;95B8 85 A4
L_95BA	lda #$00		;95BA A9 00
		sta ZP_89		;95BC 85 89
		sta ZP_87		;95BE 85 87
		dey				;95C0 88
		lda (ZP_80),Y	;95C1 B1 80
		and #$7F		;95C3 29 7F
		asl @			;95C5 0A
		rol ZP_89		;95C6 26 89
		asl @			;95C8 0A
		rol ZP_89		;95C9 26 89
		asl @			;95CB 0A
		rol ZP_89		;95CC 26 89
		sta ZP_88		;95CE 85 88
		clc				;95D0 18
		lda ZP_89		;95D1 A5 89
		adc #$A4		;95D3 69 A4
		ldx ZP_A4		;95D5 A6 A4
		beq L_95DB		;95D7 F0 02
		adc #$04		;95D9 69 04
L_95DB	sta ZP_89		;95DB 85 89
		dey				;95DD 88
		lda (ZP_80),Y	;95DE B1 80
		and #$7F		;95E0 29 7F
		asl @			;95E2 0A
		rol ZP_87		;95E3 26 87
		asl @			;95E5 0A
		rol ZP_87		;95E6 26 87
		asl @			;95E8 0A
		rol ZP_87		;95E9 26 87
		sta ZP_86		;95EB 85 86
		clc				;95ED 18
		lda ZP_87		;95EE A5 87
		adc #$A4		;95F0 69 A4
		ldx ZP_A4		;95F2 A6 A4
		beq L_95F8		;95F4 F0 02
		adc #$04		;95F6 69 04
L_95F8	sta ZP_87		;95F8 85 87
		ldy #$00		;95FA A0 00
L_95FC	lda (ZP_86),Y	;95FC B1 86
		tax				;95FE AA
		lda L_B000,X	;95FF BD 00 B0
		sta L_9610		;9602 8D 10 96
		lda (ZP_88),Y	;9605 B1 88
		tax				;9607 AA
		lda L_B000,X	;9608 BD 00 B0
		lsr @			;960B 4A
		lsr @			;960C 4A
		lsr @			;960D 4A
		lsr @			;960E 4A
		ora #$00		;960F 09 00
L_9610	equ *-1			;!
		pha				;9611 48
		lda (ZP_86),Y	;9612 B1 86
		tax				;9614 AA
		lda L_B100,X	;9615 BD 00 B1
		sta L_9626		;9618 8D 26 96
		lda (ZP_88),Y	;961B B1 88
		tax				;961D AA
		lda L_B100,X	;961E BD 00 B1
		lsr @			;9621 4A
		lsr @			;9622 4A
		lsr @			;9623 4A
		lsr @			;9624 4A
		ora #$00		;9625 09 00
L_9626		equ *-1			;!

		ldx ZP_A4		;963D A6 A4
		sta L_BF90_box_sprite_p3,X	;9643 9D 90 BF
		pla				;9646 68
		sta L_BF80_box_sprite_p2,X	;9647 9D 80 BF
		inc ZP_A4		;964A E6 A4
		cpx #$0F		;964C E0 0F
		bcs L_965E		;964E B0 0E
		iny				;9650 C8
		cpy #$08		;9651 C0 08
		bne L_95FC		;9653 D0 A7
		clc				;9655 18
		lda ZP_A3		;9656 A5 A3
		adc #$28		;9658 69 28
		tay				;965A A8
		jmp L_95BA		;965B 4C BA 95
L_965E		set_missile_sprite ;added
		clc				;965E 18
		rts				;965F 60
		
;move right
move_right	and #$0F		;9660 29 0F
		cmp #$0F		;9662 C9 0F
		bcc L_9667		;9664 90 01
		rts				;9666 60
L_9667		iny				;9667 C8
		rts				;9668 60

move_left		and #$0F		;9669 29 0F
		sec				;966B 38
		bne L_966F		;966C D0 01
		rts				;966E 60
L_966F		dey				;966F 88

		clc				;9670 18
		rts				;9671 60
move_up		and #$F0		;9672 29 F0
		sec				;9674 38
		bne L_9678		;9675 D0 01
		rts				;9677 60
L_9678		tya				;9678 98
		sbc #$10		;9679 E9 10
		tay				;967B A8
		clc				;967C 18
		rts				;967D 60
move_down		lsr @			;967E 4A
		lsr @			;967F 4A
		lsr @			;9680 4A
		lsr @			;9681 4A
		cmp #$0B		;9682 C9 0B
		bcc L_9687		;9684 90 01
		rts				;9686 60
L_9687		tya				;9687 98
		adc #$10		;9688 69 10
		tay				;968A A8
		rts				;968B 60
L_968C_update_playfield2	ldx L_AC00		;968C AE 00 AC
		cpx #$FF		;968F E0 FF
		beq L_9698		;9691 F0 05
		lda #$10		;9693 A9 10
		sta L_AF00_playfield,X	;9695 9D 00 AF
L_9698	lda ZP_84_vram2lo		;9698 A5 84
		sta ZP_80		;969A 85 80
		lda ZP_85_vram2hi		;969C A5 85
		sta ZP_81		;969E 85 81
		lda #$00		;96A0 A9 00
		sta ZP_86		;96A2 85 86
L_96A4	ldy #$04		;96A4 A0 04
		ldx ZP_86		;96A6 A6 86
L_96A8	lda L_AF00_playfield,X	;96A8 BD 00 AF
		and #$7F		;96AB 29 7F
		sta L_AF00_playfield,X	;96AD 9D 00 AF
		jsr L_96D1_draw_tile_ingame		;96B0 20 D1 96
		inc ZP_86		;96B3 E6 86
		ldx ZP_86		;96B5 A6 86
		cpx #$C0		;96B7 E0 C0
		bcc L_96BE		;96B9 90 03
		jmp L_96D0		;96BB 4C D0 96
L_96BE	cpy #$23		;96BE C0 23
		bcc L_96A8		;96C0 90 E6
		clc				;96C2 18
		lda ZP_80		;96C3 A5 80
		adc #$50		;96C5 69 50
		sta ZP_80		;96C7 85 80
		bcc L_96CD		;96C9 90 02
		inc ZP_81		;96CB E6 81
L_96CD	jmp L_96A4		;96CD 4C A4 96
L_96D0	rts				;96D0 60

;draw tile within the gameplay
L_96D1_draw_tile_ingame
		and #$3F		;96D1 29 3F
		bne L_96F0		;96D3 D0 1B
		lda #$00		;96D5 A9 00
		sta (ZP_80),Y	;96D7 91 80
		pha				;96D9 48
		clc				;96DA 18
		tya				;96DB 98
		adc #$28		;96DC 69 28
		tay				;96DE A8
		pla				;96DF 68
		sta (ZP_80),Y	;96E0 91 80
		iny				;96E2 C8
		sta (ZP_80),Y	;96E3 91 80
		pha				;96E5 48
		sec				;96E6 38
		tya				;96E7 98
		sbc #$28		;96E8 E9 28
		tay				;96EA A8
		pla				;96EB 68
		sta (ZP_80),Y	;96EC 91 80
		iny				;96EE C8
		rts				;96EF 60
L_96F0		tax				;96F0 AA
		lda element_types,X	;96F1 BD 00 5D
		and #$04		;96F4 29 04
		lsr @			;96F6 4A
		lsr @			;96F7 4A
		lsr @			;96F8 4A
		ror @			;96F9 6A
		sta ZP_AA		;96FA 85 AA
		txa				;96FC 8A
		asl @			;96FD 0A
		tax				;96FE AA
		ora ZP_AA		;96FF 05 AA
		sta (ZP_80),Y	;9701 91 80
		clc				;9703 18
		tya				;9704 98
		adc #$28		;9705 69 28
		tay				;9707 A8
		txa				;9708 8A
		ora ZP_AA		;9709 05 AA
		sta (ZP_80),Y	;970B 91 80
		inx				;970D E8
		txa				;970E 8A
		iny				;970F C8
		ora ZP_AA		;9710 05 AA
		sta (ZP_80),Y	;9712 91 80
		sec				;9714 38
		tya				;9715 98
		sbc #$28		;9716 E9 28
		tay				;9718 A8
		txa				;9719 8A
		ora ZP_AA		;971A 05 AA
		sta (ZP_80),Y	;971C 91 80
		iny				;971E C8
		rts
						;971F 60
;my solution to load level with new animation:
L_9720_next_level_animation
		
;wait for correct frontbuffer/backbuffer state
L_9723		lda ZP_14		;9723 A5 14
		and #$04		;9725 29 04
		beq L_9723		;9727 F0 FA
		lda ZP_83_vram1hi		;9729 A5 83
		cmp #$BB		;972B C9 BB
		bne L_9723		;972D D0 F4
;draw playfield
		lda #$FF		;972F A9 FF
		sta ZP_B4_ingame_flag		;9731 85 B4
		jsr load_level
		lda #$00		;9733 A9 00
		sta ZP_A3		;9735 85 A3*/
		
		
;this draws level into backbuffer:
		
L_9737		lda ZP_A3		;9737 A5 A3
		jsr L_9D3A_set_vramline_backbuffer ;L_9962_set_vramline		;9739 20 62 99
		lda ZP_A3		;973C A5 A3
		tax				;973E AA
		ldy #$04		;973F A0 04
L_9741		lda L_AF00_playfield,X	;9741 BD 00 AF
		stx ZP_88		;9744 86 88
		jsr L_96D1_draw_tile_ingame
		ldx ZP_88		;9749 A6 88
		inx				;974B E8
		txa				;974C 8A
		and #$0F		;974D 29 0F
		bne L_9741		;974F D0 F0
		clc				;9751 18
		lda ZP_A3		;9752 A5 A3
		adc #$10		;9754 69 10
		sta ZP_A3		;9756 85 A3
		cmp #$C0		;9758 C9 C0
		bcc L_9737		;975A 90 DB
		jsr L_9D6F_pause1frame		;975C 20 6F 9D
		 
;animation can begin

		mva #0 step
		sta idx
		sta line
		sta tmp
		
.local	fadeout		
loop2		mva step idx
loop		lda idx ;ypos
		sta tmp
		jsr L_9D52_set_vramline_frontbuffer
		lda #$3e ;type
		jsr L_96D1_draw_tile_ingame
		
		lda #12*16-1
		sub tmp
		
		jsr L_9D52_set_vramline_frontbuffer
		lda #$3e ;type
		jsr L_96D1_draw_tile_ingame
		
		
		
		lda idx
		add #15
		a_lt #12*16 x2		
		
		lda #0	;top left corner
		
x2		sta idx
		
		dec line
		bpl loop
		
		jsr L_9D6F_pause1frame ;pause 0
			
		inc step
		lda step
		sta line
		cmp #14
		bne loop2

.endl
		mva #0 step
		mva #16 line
		pause 10

		jsr L_991A_update_level_metadata
		update_statusbar_values
		update_level_color	

.local fadein
loop2		lda step 
		add #2
		sta idx
loop		lda idx ;ypos
		sta tmp
		jsr L_9D52_set_vramline_frontbuffer
		ldx idx
		lda $af00,x 
		jsr L_96D1_draw_tile_ingame
		
		
		lda #12*16-1
		sub tmp
		sta tmp
		
		jsr L_9D52_set_vramline_frontbuffer
		
		ldx tmp
		lda $af00,x 
		jsr L_96D1_draw_tile_ingame
		
		lda idx
		add #17
		a_lt #12*16 x2		
		
		lda #2	;1st animation coordinate
		
x2		sta idx
		
		dec line
		bpl loop
		
		pause 2
		
		inc step
		lda #13
		sub step
		sta line
		lda step
		cmp #14
		bne loop2
.endl
		
		
		mva #$00 ZP_B4_ingame_flag ;end of animation
		mva #$ff L_02FC ;reset keyboard 
		lda #$0f 
		sta result_direction ;reset direction
		rts	
		
step		dta 0
idx		dta 0
line		dta 0
tmp		dta 0

load_level	lda ZP_AE_level		;987E A5 AE
		pha				;9880 48
		and #$F0		;9881 29 F0
		lsr @			;9883 4A
		sta ZP_88		;9884 85 88
		lsr @			;9886 4A
		lsr @			;9887 4A
		adc ZP_88		;9888 65 88
		sta ZP_88		;988A 85 88
		clc				;988C 18
		pla				;988D 68
		and #$0F		;988E 29 0F
		adc ZP_88		;9890 65 88
		pha				;9892 48
		and #$03		;9893 29 03
		bne L_98A5		;9895 D0 0E
		ldx #$01		;9897 A2 01
		pla				;9899 68
		pha				;989A 48
		and #$04		;989B 29 04
		beq L_98A0		;989D F0 01
		inx				;989F E8
L_98A0		lda #$00		;98A0 A9 00
		jsr rmt.initingame
		
L_98A5		pla				;98A5 68
		tax				;98A6 AA
		lda L_1A80_leveldata_ptrH,X	;98A7 BD 80 1A
		sta ZP_89		;98AA 85 89
		lda L_1A00_leveldata_ptrL,X	;98AC BD 00 1A
		sta ZP_88		;98AF 85 88
		ldx #$00		;98B1 A2 00
		ldy #$01		;98B3 A0 01
L_98B5		lda (ZP_88),Y	;98B5 B1 88
		bpl L_98D2		;98B7 10 19
;if >=$80 clear but 7 and repeat as many times as next byte
		and #$7F		;98B9 29 7F
		pha				;98BB 48
		iny				;98BC C8
		lda (ZP_88),Y	;98BD B1 88
		sty ZP_A4		;98BF 84 A4
		tay				;98C1 A8
		pla				;98C2 68
;next level is written here
L_98C3		sta L_AF00_playfield,X	;98C3 9D 00 AF
		inx				;98C6 E8
		dey				;98C7 88
		cpy #$FF		;98C8 C0 FF
		bne L_98C3		;98CA D0 F7
		ldy ZP_A4		;98CC A4 A4
		dex				;98CE CA
		jmp L_98D5		;98CF 4C D5 98
L_98D2		sta L_AF00_playfield,X	;98D2 9D 00 AF
L_98D5		iny				;98D5 C8
		inx				;98D6 E8
		cpx #$C0		;98D7 E0 C0
		bcc L_98B5		;98D9 90 DA
		ldx #$00		;98DB A2 00
L_98DD		lda (ZP_88),Y	;98DD B1 88
		sta L_AFC0,X	;98DF 9D C0 AF
		iny				;98E2 C8
		inx				;98E3 E8
		cpx #$15		;98E4 E0 15
		bcc L_98DD		;98E6 90 F5
		ldx #$07		;98E8 A2 07
L_98EA		lda L_AFC0,X	;98EA BD C0 AF
		sta L_BFB0_switch_positions,X	;98ED 9D B0 BF
		lda L_AFC8,X	;98F0 BD C8 AF
		sta L_BFB8,X	;98F3 9D B8 BF
		dex				;98F6 CA
		bpl L_98EA		;98F7 10 F1
		lda L_AFD0		;98F9 AD D0 AF
		sta L_AC00		;98FC 8D 00 AC
		lda L_AFD1		;98FF AD D1 AF
		sta L_AD00		;9902 8D 00 AD
;player starting position?
		lda L_AFD2		;9905 AD D2 AF
		sta ZP_A6		;9908 85 A6
		sta ZP_9A		;990A 85 9A
		sta ZP_95		;990C 85 95
;level exit position:
		lda L_AFD3		;990E AD D3 AF
		sta ZP_B5		;9911 85 B5
		tax				;9913 AA
		lda #$30		;9914 A9 30
		sta L_AF00_playfield,X	;9916 9D 00 AF
		rts				;9919 60
		
L_991A_update_level_metadata
		jsr L_9D6F_pause1frame		;991A 20 6F 9D
		lda #$00		;991D A9 00
		sta ZP_A8		;991F 85 A8
		sta ZP_A5		;9921 85 A5
		sta ZP_99		;9923 85 99
		sta ZP_BB		;9925 85 BB
		lda #$01		;9927 A9 01
		sta ZP_90		;9929 85 90
		lda #$FF		;992B A9 FF
		sta ZP_B2		;992D 85 B2
		sta ZP_B3		;992F 85 B3
		sta ZP_B7_lenses_to_destroy		;9931 85 B7
		sta ZP_B6_disks_to_collect		;9933 85 B6
		sta direction		;9935 8D F6 9E
		ldx #$00		;9938 A2 00
		txa				;993A 8A
L_993B		sta L_AE00,X	;993B 9D 00 AE
		inx				;993E E8
		bne L_993B		;993F D0 FA
		ldx #$03		;9941 A2 03
L_9943		sta door_opening_phase,X	;9943 9D 09 A0
		dex				;9946 CA
		bpl L_9943		;9947 10 FA
		ldx #$00		;9949 A2 00
L_994B		lda L_AF00_playfield,X	;994B BD 00 AF
		and #$7F		;994E 29 7F
		cmp #$35		;9950 C9 35
		bne L_9956		;9952 D0 02
		inc ZP_B7_lenses_to_destroy		;9954 E6 B7
L_9956		cmp #$21		;9956 C9 21
		bne L_995C		;9958 D0 02
		inc ZP_B6_disks_to_collect		;995A E6 B6
L_995C		inx				;995C E8
		cpx #$C0		;995D E0 C0
		bcc L_994B		;995F 90 EA
		rts				;9961 60 

;game initialization - some lookuptables
L_9A05_game_init	mva #$00 do_silence
		ldx #$00		;9A05 A2 00
L_9A07		lda #$00		;9A07 A9 00
		sta L_B000,X	;9A09 9D 00 B0
		sta L_B100,X	;9A0C 9D 00 B1
		txa				;9A0F 8A
		ldy #$03		;9A10 A0 03
L_9A12		lsr @			;9A12 4A
		ror L_B000,X	;9A13 7E 00 B0
		lsr @			;9A16 4A
		ror L_B100,X	;9A17 7E 00 B1
		dey				;9A1A 88
		bpl L_9A12		;9A1B 10 F5
		lda L_B000,X	;9A1D BD 00 B0
		and L_B100,X	;9A20 3D 00 B1
		sta L_B200,X	;9A23 9D 00 B2
		eor #$FF		;9A26 49 FF
		tay				;9A28 A8
		and L_B000,X	;9A29 3D 00 B0
		sta L_B000,X	;9A2C 9D 00 B0
		tya				;9A2F 98
		and L_B100,X	;9A30 3D 00 B1
		sta L_B100,X	;9A33 9D 00 B1
		inx				;9A36 E8
		bne L_9A07		;9A37 D0 CE

;clear gamevram and more
		ldx #$00		;9A39 A2 00
		txa				;9A3B 8A
L_9A3C		sta L_B800_gamevram,X	;9A3C 9D 00 B8
		sta L_B900,X	;9A3F 9D 00 B9
		sta L_BA00,X	;9A42 9D 00 BA
		sta L_BB00,X	;9A45 9D 00 BB
		sta L_BBC0,X	;9A48 9D C0 BB
		sta L_BCC0,X	;9A4B 9D C0 BC
		sta L_BDC0,X	;9A4E 9D C0 BD
		sta L_BEC0,X	;9A51 9D C0 BE
		dex				;9A54 CA
		bne L_9A3C		;9A55 D0 E5

;clear statusbar vram
		ldx #$77		;9A60 A2 77
		lda #$00		;9A62 A9 00
L_9A64		lda statusbar_vram,X	;9A64 9D 40 5D
		dex				;9A67 CA
		bpl L_9A64		;9A68 10 FA

		update_statusbar_values ;:3 nop

;default players,missiles,widths		
		ldx #$0C		;9A6D A2 0C
		lda #$00		;9A6F A9 00
L_9A71		sta hposp0,X	;9A71 9D 00 D0
		dex				;9A74 CA
		bpl L_9A71		;9A75 10 FA
		;added gtia
		lda #$31+64		;9A77 A9 31
		sta gprior		;9A79 8D 6F 02
		lda #$03		;9A7C A9 03
		sta gractl		;9A7E 8D 1D D0
		lda #$B4		;9A81 A9 B4
		sta pmbase		;9A83 8D 07 D4
		ldx #$00		;9A86 A2 00
		txa				;9A88 8A
L_9A89	lda #$00		;9A89 A9 00
		cpx #$D8		;9A8B E0 D8
		bcc L_9A91		;9A8D 90 02
		lda #$FF		;9A8F A9 FF
L_9A91	cpx #$F0		;9A91 E0 F0
		bcc L_9A97		;9A93 90 02
		lda #$00		;9A95 A9 00
;init of new game (starts somewhere above)
L_9A97		sta L_AF00_playfield,X	;9A97 9D 00 AF
		sta L_B400_player0_data,X	;9A9A 9D 00 B4
		sta L_B500_player1_data,X	;9A9D 9D 00 B5
		sta L_B600_player2_data,X	;9AA0 9D 00 B6
		sta L_B700_player3_data,X	;9AA3 9D 00 B7
		inx				;9AA9 E8
		bne L_9A89		;9AAA D0 DD
		draw_side_lines
		lda #$00		;9AAC A9 00
		sta ZP_96		;9AAE 85 96
		sta ZP_99		;9AB0 85 99
		sta ZP_98		;9AB2 85 98
		sta ZP_A5		;9AB4 85 A5
		sta ZP_97		;9AB6 85 97
		sta ZP_AC		;9AB8 85 AC
		sta ZP_B4_ingame_flag		;9ABA 85 B4
		lda #$80		;9ABC A9 80
		sta ZP_BB		;9ABE 85 BB
		sta ZP_11		;9AC0 85 11
		ldx #1
		jsr rmt.initingame
		jsr L_9D6F_pause1frame		;9AD0 20 6F 9D
		lda #$00		;9AD3 A9 00
		sta ZP_14		;9AD5 85 14
		lda #$00		;9AD7 A9 00
		sta ZP_84_vram2lo		;9AD9 85 84
		lda #$B8		;9ADB A9 B8
		sta ZP_85_vram2hi		;9ADD 85 85
		lda #$C0		;9ADF A9 C0
		sta ZP_82_vram1lo		;9AE1 85 82
		lda #$BB		;9AE3 A9 BB
		sta ZP_83_vram1hi		;9AE5 85 83
		mwa #L_9B86_gamevbi L_0222
		mwa #ingameDLI.start L_0200
		lda #$00		;9B07 A9 00
		sta ZP_9B		;9B09 85 9B
		lda #$C0		;9B0B A9 C0
		sta nmien		;9B0D 8D 0E D4
		rts				;9B10 60
		
L_9B11_stop_music	jsr L_9D6F_pause1frame		;9B11 20 6F 9D
		mva #$00 do_silence ;turn off music temporarily
		mwa #titlevbi L_0222
		lda #$00		;9B23 A9 00
		sta hposp0		;9B25 8D 00 D0
		sta hposp1		;9B28 8D 01 D0
		sta sdmctl		;9B2B 8D 2F 02
		jmp L_9D6F_pause1frame		;9B2E 4C 6F 9D

L_9B31_switch_buffers		
		lda ZP_98		;9B31 A5 98
		beq L_9B3F		;9B33 F0 0A
		lda ZP_A2		;9B35 A5 A2
		jsr L_9D3A_set_vramline_backbuffer		;9B37 20 3A 9D
		lda #$00		;9B3A A9 00
		jsr L_96D1_draw_tile_ingame		;9B3C 20 D1 96
L_9B3F		inc ZP_97		;9B3F E6 97
		lda ZP_97		;9B41 A5 97
		lsr @			;9B43 4A
		bcc L_9B59		;9B44 90 13
		lda #$C0		;9B46 A9 C0
		sta ZP_84_vram2lo		;9B48 85 84
		lda #$BB		;9B4A A9 BB
		sta ZP_85_vram2hi		;9B4C 85 85
		lda #$00		;9B4E A9 00
		sta ZP_82_vram1lo		;9B50 85 82
		lda #$B8		;9B52 A9 B8
		sta ZP_83_vram1hi		;9B54 85 83
		jmp L_9B69		;9B56 4C 69 9B
		
L_9B59		lda #$00		;9B59 A9 00
		sta ZP_84_vram2lo		;9B5B 85 84
		lda #$B8		;9B5D A9 B8
		sta ZP_85_vram2hi		;9B5F 85 85
		lda #$C0		;9B61 A9 C0
		sta ZP_82_vram1lo		;9B63 85 82
		lda #$BB		;9B65 A9 BB
		sta ZP_83_vram1hi		;9B67 85 83
L_9B69		lda ZP_82_vram1lo		;9B69 A5 82
		sta L_9409_dl_vramlo		;9B6B 8D 09 94
		lda ZP_83_vram1hi		;9B6E A5 83
		sta L_940A_dl_vramhi		;9B70 8D 0A 94
		rts				;9B73 60

L_9B74	lda ZP_98		;9B74 A5 98
		bne L_9B79		;9B76 D0 01
		rts				;9B78 60
L_9B79	lda ZP_A2		;9B79 A5 A2
		jsr L_9D52_set_vramline_frontbuffer		;9B7B 20 52 9D
		ldx ZP_A2		;9B7E A6 A2
		lda L_AF00_playfield,X	;9B80 BD 00 AF
		jmp L_96D1_draw_tile_ingame		;9B83 4C D1 96

;here starts gameplay VBI
L_9B86_gamevbi	inc ZP_14		;9B86 E6 14

		;side lines
		mva #62 hposm0
		mva #193 hposm1
		;mva #$0f colpf0+3		
		mwa #ingameDLI.start L_0200
		mva #$31+192 prior
		mva #>tilesfont1 chbase
		mva #C_GTIA_LUMINANCE colpf3+1


		ldx #$07		;9B88 A2 07
L_9B8A		lda L_9FBE_gamecolors,X	;9B8A BD BE 9F
		sta colpm0,X	;9B8D 9D 12 D0
		dex				;9B90 CA
		bpl L_9B8A		;9B91 10 F7
		ldx #$03		;9B93 A2 03
		lda #$00		;9B95 A9 00
L_9B97		sta sizep0,X	;9B97 9D 08 D0
		dex				;9B9A CA
		bpl L_9B97		;9B9B 10 FA
		lda #$3E		;9B9D A9 3E
		sta dmactl		;9B9F 8D 00 D4
		ldx #<L_9406_gamedl		;9BA2 A2 06
		ldy #>L_9406_gamedl		;9BA4 A0 94
		bit ZP_B4_ingame_flag		;9BA6 24 B4
		bpl L_9BAE		;9BA8 10 04
		;next level animation DL:
		ldx #<L_9406_gamedl ;#$00		;9BAA A2 00
		ldy #>L_9406_gamedl ;#$AE		;9BAC A0 AE
L_9BAE		stx dlistl		;9BAE 8E 02 D4
		sty dlisth		;9BB1 8C 03 D4
		lda ZP_80		;9BB4 A5 80
		pha				;9BB6 48
		lda ZP_81		;9BB7 A5 81
		pha				;9BB9 48
;setting laser animation sequence
		lda ZP_14		;9BBA A5 14
		and #$0C		;9BBC 29 0C
		asl @			;9BBE 0A
		asl @			;9BBF 0A
		adc #$7A		;9BC0 69 7A
		sta ZP_8A		;9BC2 85 8A
		lda #>beam_data ;$9F		;9BC4 A9 9F
		adc #$00		;9BC6 69 00
		sta ZP_8B		;9BC8 85 8B
;redraw laser characters from $9fxx
		ldy #$0F		;9BCA A0 0F
L_9BCC	lda (ZP_8A),Y	;9BCC B1 8A
		sta L_A410_laser_tile_top1,Y	;9BCE 99 10 A4
		sta L_A810_laser_tile_bottom1,Y	;9BD1 99 10 A8
		dey				;9BD4 88
		bpl L_9BCC		;9BD5 10 F5
		ldy #$00		;9BD7 A0 00
		ldx #$0F		;9BD9 A2 0F
L_9BDB	lda (ZP_8A),Y	;9BDB B1 8A
		sta L_A420_laser_tile_top2,X	;9BDD 9D 20 A4
		sta L_A820_laser_tile_bottom2,X	;9BE0 9D 20 A8
		iny				;9BE3 C8
		dex				;9BE4 CA
		bpl L_9BDB		;9BE5 10 F4
		lda ZP_14		;9BE7 A5 14
		and #$07		;9BE9 29 07
		cmp #$04		;9BEB C9 04
		bne L_9BF6		;9BED D0 07
		bit ZP_B4_ingame_flag		;9BEF 24 B4
		bmi L_9BF6		;9BF1 30 03
		jsr L_9B31_switch_buffers		;9BF3 20 31 9B
;delete tank Player
L_9BF6		ldy ZP_A0		;9BF6 A4 A0
		ldx #$0F		;9BF8 A2 0F
		lda #$00		;9BFA A9 00
L_9BFC		sta L_B400_player0_data,Y	;9BFC 99 00 B4
		sta L_B500_player1_data,Y	;9BFF 99 00 B5
		iny				;9C02 C8
		dex				;9C03 CA
		bpl L_9BFC		;9C04 10 F6
		ldy ZP_98		;9C06 A4 98
		beq L_9C1B	;9C08 F0 11
;delete box Player		
		ldy ZP_A1		;9C0A A4 A1
		ldx #$0F		;9C0C A2 0F
L_9C0E		sta L_B600_player2_data,Y	;9C0E 99 00 B6
		sta L_B700_player3_data,Y	;9C11 99 00 B7

		iny				;9C17 C8
		dex				;9C18 CA
		bpl L_9C0E		;9C19 10 F3

		delete_missile_sprite

L_9C1B		bit ZP_BB		;9C1B 24 BB
		bmi L_9C23		;9C1D 30 04
		bit ZP_B4_ingame_flag		;9C1F 24 B4
		bpl L_9C26		;9C21 10 03
L_9C23		jmp L_9D28		;9C23 4C 28 9D
L_9C26		lda ZP_14		;9C26 A5 14
		and #$07		;9C28 29 07
		bne L_9C33		;9C2A D0 07
		jsr L_94A7		;9C2C 20 A7 94
		bcs L_9C33		;9C2F B0 02
		inc ZP_A5		;9C31 E6 A5
L_9C33	bit ZP_AB		;9C33 24 AB
		bpl L_9C42		;9C35 10 0B
		ldx ZP_99		;9C37 A6 99
		inx				;9C39 E8
		cpx #$08		;9C3A E0 08
		bcc L_9C5E		;9C3C 90 20
		ldx #$00		;9C3E A2 00
		beq L_9C5E		;9C40 F0 1C
L_9C42	ldx ZP_A5		;9C42 A6 A5
		beq L_9C60		;9C44 F0 1A
		ldx ZP_99		;9C46 A6 99
		inx				;9C48 E8
		cpx #$08		;9C49 E0 08
		bcc L_9C5E		;9C4B 90 11
		bit ZP_AB		;9C4D 24 AB
		bmi L_9C5E		;9C4F 30 0D
		lda ZP_9A		;9C51 A5 9A
		sta ZP_A6		;9C53 85 A6
		jsr L_9B74		;9C55 20 74 9B
		ldx #$00		;9C58 A2 00
		stx ZP_A5		;9C5A 86 A5
		stx ZP_98		;9C5C 86 98
L_9C5E	stx ZP_99		;9C5E 86 99
L_9C60	lda ZP_99		;9C60 A5 99
		lsr @			;9C62 4A
		lsr @			;9C63 4A
		and #$01		;9C64 29 01
		asl @			;9C66 0A
		asl @			;9C67 0A
		asl @			;9C68 0A
		asl @			;9C69 0A
		sta L_9C7B		;9C6A 8D 7B 9C
		lda ZP_96		;9C6D A5 96
		bit ZP_AB		;9C6F 24 AB
		bpl L_9C75		;9C71 10 02
		ora #$04		;9C73 09 04
L_9C75	asl @			;9C75 0A
		asl @			;9C76 0A
		asl @			;9C77 0A
		asl @			;9C78 0A
		asl @			;9C79 0A
		ora #$00		;9C7A 09 00
L_9C7B	equ *-1			;!
		sta ZP_8C		;9C7C 85 8C
		sta ZP_8A		;9C7E 85 8A
		clc				;9C80 18
		ldx #>tank_pmdata ;$87		;9C81 A2 87
		stx ZP_8D		;9C83 86 8D
		inx				;9C85 E8
		stx ZP_8B		;9C86 86 8B
		lda ZP_96		;9C88 A5 96
		asl @			;9C8A 0A
		asl @			;9C8B 0A
		asl @			;9C8C 0A
		adc ZP_99		;9C8D 65 99
		bit ZP_AB		;9C8F 24 AB
		bpl L_9C95		;9C91 10 02
		lda #$00		;9C93 A9 00
L_9C95		pha				;9C95 48
		tax				;9C96 AA
		lda ZP_A6		;9C97 A5 A6
		cmp #$C0		;9C99 C9 C0
		bcc L_9CA1		;9C9B 90 04
		pla				;9C9D 68
		jmp L_9D28		;9C9E 4C 28 9D
L_9CA1		and #$F0		;9CA1 29 F0
		adc #$14		;9CA3 69 14
		clc				;9CA5 18
		adc beam_data+1,X	;9CA6 7D 01 9F
		sta ZP_A0		;9CA9 85 A0
		tax				;9CAB AA
		ldy #$00		;9CAC A0 00
;setting player (PM) data stored orig. at 8700-8900
L_9CAE_draw_pmg_tank
		lda (ZP_8C),Y	;9CAE B1 8C
		sta L_B400_player0_data,X	;9CB0 9D 00 B4
		lda (ZP_8A),Y	;9CB3 B1 8A
		sta L_B500_player1_data,X	;9CB5 9D 00 B5
		inx				;9CB8 E8
		iny				;9CB9 C8
		cpy #$10		;9CBA C0 10
		bcc L_9CAE_draw_pmg_tank		;9CBC 90 F0
		pla				;9CBE 68
		tax				;9CBF AA
		lda ZP_A6		;9CC0 A5 A6
		and #$0F		;9CC2 29 0F
		asl @			;9CC4 0A
		asl @			;9CC5 0A
		asl @			;9CC6 0A
		adc #$40		;9CC7 69 40
		adc L_9F21,X	;9CC9 7D 21 9F
		sta hposp0		;9CCC 8D 00 D0
		sta hposp1		;9CCF 8D 01 D0
		lda ZP_98		;9CD2 A5 98
		beq L_9D28		;9CD4 F0 52
		txa				;9CD6 8A
		pha				;9CD7 48
		clc				;9CD8 18
		lda ZP_9A		;9CD9 A5 9A
		and #$F0		;9CDB 29 F0
		adc #$14		;9CDD 69 14
		clc				;9CDF 18
		adc beam_data+1,X	;9CE0 7D 01 9F
		sta ZP_A1		;9CE3 85 A1
		tax				;9CE5 AA
		ldy #$00		;9CE6 A0 00
;setting for box being pushed
L_9CE8		lda L_BF80_box_sprite_p2,Y	;9CE8 B9 80 BF
		sta L_B600_player2_data,X	;9CEB 9D 00 B6
		lda L_BF90_box_sprite_p3,Y	;9CEE B9 90 BF
		sta L_B700_player3_data,X	;9CF1 9D 00 B7
		lda L_BFA0_box_sprite_m,Y	;9CF4 B9 A0 BF
		sta L_B300_missile_data,X	;9CF7 9D 00 B3
		inx				;9CFA E8
		iny				;9CFB C8
		cpy #$10		;9CFC C0 10
		bcc L_9CE8		;9CFE 90 E8
		pla				;9D00 68
		tax				;9D01 AA
		lda ZP_9A		;9D02 A5 9A
		and #$0F		;9D04 29 0F
		asl @			;9D06 0A
		asl @			;9D07 0A
		asl @			;9D08 0A
		clc				;9D09 18
		adc #$40		;9D0A 69 40
		adc L_9F21,X	;9D0C 7D 21 9F
		sta hposp2		;9D0F 8D 02 D0
		sta hposp3		;9D12 8D 03 D0
		sta hposm2		;9D15 8D 07 D0

		mva #%00110000 sizem

L_9D28		control2
		
		
/*
;disable music flag	
	IFT C_DISABLE_INGAME_MUSIC = 0
		lda ZP_30_ingame_music_on
		bne nosound
		lda do_silence
		beq nosound
		rmt.rmt_play_unisystem
		jmp vbicont
nosound		jsr rmt.rmt_silence
vbicont			
	ELS
		jsr rmt.rmt_silence
	EIF		
*/
		pla				;9D2E 68
		sta ZP_81		;9D2F 85 81
		pla				;9D31 68
		sta ZP_80		;9D32 85 80
		pla				;9D34 68
		tay				;9D35 A8
		pla				;9D36 68
		tax				;9D37 AA
		pla				;9D38 68
		rti				;9D39 40
;end of ingame VBI

L_9D3A_set_vramline_backbuffer	
		tay				;9D3A A8
		and #$F0		;9D3B 29 F0
		lsr @			;9D3D 4A
		lsr @			;9D3E 4A
		lsr @			;9D3F 4A
		tax				;9D40 AA
		lda L_9F4A_lineshift_lo,X	;9D41 BD 4A 9F
		adc ZP_84_vram2lo		;9D44 65 84
		sta ZP_80		;9D46 85 80
		lda L_9F62_lineshift_hi,X	;9D48 BD 62 9F
		adc ZP_85_vram2hi		;9D4B 65 85
		sta ZP_81		;9D4D 85 81
		jmp L_9D67		;9D4F 4C 67 9D

L_9D52_set_vramline_frontbuffer		
		tay				;9D52 A8
		and #$F0		;9D53 29 F0
		lsr @			;9D55 4A
		lsr @			;9D56 4A
		lsr @			;9D57 4A
		tax				;9D58 AA
		lda L_9F4A_lineshift_lo,X	;9D59 BD 4A 9F
		adc ZP_82_vram1lo		;9D5C 65 82
		sta ZP_80		;9D5E 85 80
		lda L_9F62_lineshift_hi,X	;9D60 BD 62 9F
		adc ZP_83_vram1hi		;9D63 65 83
		sta ZP_81		;9D65 85 81
L_9D67		tya				;9D67 98
		and #$0F		;9D68 29 0F
		asl @			;9D6A 0A
		adc #$04		;9D6B 69 04
		tay				;9D6D A8
		rts				;9D6E 60
		
L_9D6F_pause1frame	lda ZP_14		;9D6F A5 14
L_9D71		cmp ZP_14		;9D71 C5 14
		beq L_9D71		;9D73 F0 FC
		rts				;9D75 60
;ingame DLI:
.local		ingameDLI

start		pha
		sta wsync
		mva #$31 prior	;turn off gtia
		mva #0 colpf0+4
		mwa #primary L_0200
		mva #23 zp_9b
		pla
		rti

primary		pha				;9D76 48
		sta wsync
		mva #$a8 chbase
		dec zp_9b
		beq x1
		mwa #alternate L_0200
		pla				;9D8D 68
		rti				;9D8E 40
		
alternate		pha
		sta wsync
		mva #>tilesfont1 chbase
		dec zp_9b
		beq x1
		mwa #primary L_0200
		pla 
		rti
		
x1		mwa #statusbar L_0200
		pla
		rti
		
statusbar		pha 
		txa				;9D8F 8A
		pha
:1		sta wsync	
		mva #0 hposp0
		sta hposp1
:2		sta wsync	
		mva #$31+192 prior
		mva #C_GTIA_LUMINANCE colpf3+1
		
		sta wsync
		mva #62 hposp3
		mva #$ea colpm0+3
		sta wsync
		mva #$00 colpf3+1
		mva #$0 prior
		lda #>statusfont		;9DAC A9 84
		sta chbase		;9DAE 8D 09 D4
		lda #$00		;9DB1 A9 00
		sta ZP_9B		;9DB3 85 9B
		mwa #ending L_0200

		
		mva #64+8*16+1 hposm3
		mva #64+8*4 hposp0
		mva #64+8*9 hposp2
		mva #64+8*13 hposp1
		mva #$c8 colpm0
		lda #$78
lensescolor	equ *-1
		sta colpm0+2
		mva #$ea colpm0+1

		sta wsync
		mva #$0e colpf3
		mva #$04 colpf0
		mva #$08 colpf1
		
;number colors:
		mva #$0c colpf2
:4		sta wsync
		mva #$0e colpf2
:4		sta wsync
		mva #$0c colpf2
:2		sta wsync
		mva #$0a colpf2
:2		sta wsync
		mva #$08 colpf2
		
		pla				;9DB5 68
		tax				;9DB6 AA
		pla				;9DB7 68
		rti

ending
		phr ;pha 
		sta wsync		
		mva #$31+192 prior
		mva #C_GTIA_LUMINANCE colpf3+1
		
;disable music flag	
	IFT C_DISABLE_INGAME_MUSIC = 0
		lda ZP_30_ingame_music_on
		bne nosound
		lda do_silence
		beq nosound
		rmt.rmt_play_unisystem
		jmp vbicont
nosound		jsr rmt.rmt_silence
vbicont			
	ELS
		jsr rmt.rmt_silence
	EIF			
		
		plr ;pla
		rti						
.endl
		
direction	dta 0			
L_9EF7	dta $31			
L_9EF8_direction_keys
	dta $07,$06,$0E,$0F ;+ * - =
L_9EFC	dta $07,$0B,$0E,$0D
	
	.align $100   ;laser beam data requires alignment 
	
beam_data	dta $83,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00
	dta $00,$FE,$FC,$FA,$F8,$F6,$F4,$F2,$00,$02,$04,$06,$08,$0A,$0C,$0E
L_9F21	dta $00,$01,$02,$03,$04,$05,$06,$07,$00,$FF,$FE,$FD,$FC,$FB,$FA,$F9
	dta $00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00
L_9F41	dta $DD		

;pointers to movement routines
movement_routines	
	dta a(move_right)
	dta a(move_left)
	dta a(move_up)
	dta a(move_down)

L_9F4A_lineshift_lo
	dta $00,$28,$50,$78,$A0,$C8,$F0,$18,$40,$68,$90,$B8,$E0,$08,$30,$58
	dta $80,$A8,$D0,$F8,$20,$48,$70,$98
L_9F62_lineshift_hi
	dta $00,$00,$00,$00,$00,$00,$00,$01
L_9F6A	dta $01,$01,$01,$01,$01,$02,$02,$02,$02,$02,$02,$02,$03,$03,$03

L_9F79	dta $03,$02,$03,$0C,$08,$20,$10,$40,$80,$80,$40,$10,$20,$08,$0C,$03
		dta $02,$03,$02,$08,$04,$10,$20,$80,$C0,$40,$80,$20,$30,$0C,$08,$02
		dta $01,$02,$01,$04,$08,$20,$30,$C0,$80,$80,$C0,$30,$20,$08,$04,$01
		dta $02,$01,$02,$08,$0C,$30,$20,$80,$40,$C0,$80,$20,$10,$04,$08,$02
		dta $03			;9FB9 03   #
L_9FBA	dta $40,$68,$90,$A0
L_9FBE_gamecolors	dta $a4,$c8 ;tank sprite
		dta $0e,$04 ;box sprite
	IFT C_PG_STYLE = 0
		dta $22,$C4,$7C,$96 ;playfield
	ELS
		dta $0e,$04,$78,$ea ;playfield
	EIF
	
door_opening_phase
	dta $00,$00,$00,$00

run_laser	lda ZP_A8		;A016 A5 A8
		beq L_A01D		;A018 F0 03
		inc ZP_A8		;A01A E6 A8
		rts				;A01C 60
L_A01D	lda #$00		;A01D A9 00
		sta ZP_B0		;A01F 85 B0
		sta ZP_B1		;A021 85 B1
		lda ZP_B2		;A023 A5 B2
		ora ZP_B3		;A025 05 B3
		bne L_A02C		;A027 D0 03
		jmp L_A166		;A029 4C 66 A1
L_A02C	lda ZP_B3		;A02C A5 B3
		bmi L_A038		;A02E 30 08
		lda ZP_B2		;A030 A5 B2
		bne L_A036		;A032 D0 02
		dec ZP_B3		;A034 C6 B3
L_A036	dec ZP_B2		;A036 C6 B2
L_A038	lda #$00		;A038 A9 00
		sta ZP_91		;A03A 85 91
		lda ZP_90		;A03C A5 90
		sta ZP_92		;A03E 85 92
L_A040	jsr L_A04C		;A040 20 4C A0
		inc ZP_91		;A043 E6 91
		lda ZP_91		;A045 A5 91
		cmp ZP_92		;A047 C5 92
		bcc L_A040		;A049 90 F5
return		rts				;A04B 60
L_A04C	ldx ZP_91		;A04C A6 91
		lda L_AC00,X	;A04E BD 00 AC
		cmp #$FF		;A051 C9 FF
		beq L_A07D		;A053 F0 28
		sta ZP_94		;A055 85 94
		jsr L_9403		;A057 20 03 94
		tya				;A05A 98
		ldx ZP_91		;A05B A6 91
		ldy L_AD00,X	;A05D BC 00 AD
		clc				;A060 18
		adc L_A390,Y	;A061 79 90 A3
		tay				;A064 A8
		lda #$00		;A065 A9 00
		sta ZP_93		;A067 85 93
		clc				;A069 18
		lda ZP_84_vram2lo		;A06A A5 84
		adc #$98		;A06C 69 98
		sta L_A0A6		;A06E 8D A6 A0
		lda ZP_85_vram2hi		;A071 A5 85
		adc #$03		;A073 69 03
		sta L_A0AA		;A075 8D AA A0
L_A078	jsr L_A07E		;A078 20 7E A0
		bcc L_A078		;A07B 90 FB
L_A07D	rts				;A07D 60

L_A07E		inc ZP_93		;A07E E6 93
		ldx ZP_91		;A080 A6 91
		lda L_AD00,X	;A082 BD 00 AD
		pha				;A085 48
		tax				;A086 AA
		clc				;A087 18
		lda ZP_80		;A088 A5 80
		adc L_A3B8,X	;A08A 7D B8 A3
		sta ZP_80		;A08D 85 80
		lda ZP_81		;A08F A5 81
		adc L_A3C0,X	;A091 7D C0 A3
		sta ZP_81		;A094 85 81
		lda ZP_80		;A096 A5 80
		cmp ZP_84_vram2lo		;A098 C5 84
		lda ZP_81		;A09A A5 81
		sbc ZP_85_vram2hi		;A09C E5 85
		bcs L_A0A3		;A09E B0 03
L_A0A0	pla				;A0A0 68
		sec				;A0A1 38
		rts				;A0A2 60
L_A0A3	lda ZP_80		;A0A3 A5 80
		cmp #$00		;A0A5 C9 00
L_A0A6	equ *-1			;!
		lda ZP_81		;A0A7 A5 81
		sbc #$00		;A0A9 E9 00
L_A0AA	equ *-1			;!
		bcs L_A0A0		;A0AB B0 F3
		clc				;A0AD 18
		tya				;A0AE 98
		adc L_A3C8,X	;A0AF 7D C8 A3
		bmi L_A0A0		;A0B2 30 EC
		cmp #$03		;A0B4 C9 03
		beq L_A0A0		;A0B6 F0 E8
		cmp #$2B		;A0B8 C9 2B
		beq L_A0A0		;A0BA F0 E4
		cmp #$24		;A0BC C9 24
		beq L_A0A0		;A0BE F0 E0
		cmp #$4C		;A0C0 C9 4C
		beq L_A0A0		;A0C2 F0 DC
		tay				;A0C4 A8
		lda ZP_93		;A0C5 A5 93
		and #$01		;A0C7 29 01
		sta ZP_88		;A0C9 85 88
		pla				;A0CB 68
		asl @			;A0CC 0A
		clc				;A0CD 18
		adc ZP_88		;A0CE 65 88
		tax				;A0D0 AA
		lda ZP_94		;A0D1 A5 94
		adc L_A3A8,X	;A0D3 7D A8 A3
		sta ZP_94		;A0D6 85 94
		lda (ZP_80),Y	;A0D8 B1 80
		beq L_A148		;A0DA F0 6C
		ldx ZP_94		;A0DC A6 94
		lda L_AF00_playfield,X	;A0DE BD 00 AF
		and #$3F		;A0E1 29 3F
		cmp #$20		;A0E3 C9 20
		bcc L_A111		;A0E5 90 2A
		sty L_A110		;A0E7 8C 10 A1
		tax				;A0EA AA
		lda element_types,X	;A0EB BD 00 5D
		and #$02		;A0EE 29 02
		beq L_A0F8		;A0F0 F0 06
		jsr L_A171		;A0F2 20 71 A1
		jmp L_A10F		;A0F5 4C 0F A1
L_A0F8	txa				;A0F8 8A
		sec				;A0F9 38
		sbc #$20		;A0FA E9 20
		asl @			;A0FC 0A
		tax				;A0FD AA
		lda element_routine_lookup,X	;A0FE BD 4C A3
		sta L_A10D		;A101 8D 0D A1
		lda element_routine_lookup+1,X	;A104 BD 4D A3
		sta L_A10E		;A107 8D 0E A1
		ldx ZP_94		;A10A A6 94
L_A10C	jsr L_A10C		;A10C 20 0C A1
L_A10D	equ *-2			;!
L_A10E	equ *-1			;!
L_A10F	ldy #$00		;A10F A0 00
L_A110	equ *-1			;!
L_A111	ldx ZP_94		;A111 A6 94
		lda L_AF00_playfield,X	;A113 BD 00 AF
		ora #$80		;A116 09 80
		sta L_AF00_playfield,X	;A118 9D 00 AF
		and #$3F		;A11B 29 3F
		tax				;A11D AA
		lda element_types,X	;A11E BD 00 5D
		bpl L_A146		;A121 10 23
		ldx ZP_91		;A123 A6 91
		lda L_AD00,X	;A125 BD 00 AD
		asl @			;A128 0A
		tax				;A129 AA
		lda ZP_80		;A12A A5 80
		and #$0F		;A12C 29 0F
		beq L_A131		;A12E F0 01
		inx				;A130 E8
L_A131	lda L_A398,X	;A131 BD 98 A3
		ldx ZP_92		;A134 A6 92
		cpx #$FF		;A136 E0 FF
		beq L_A146		;A138 F0 0C
		sta L_AD00,X	;A13A 9D 00 AD
		lda ZP_94		;A13D A5 94
		sta L_AC00,X	;A13F 9D 00 AC
		inx				;A142 E8
		stx ZP_92		;A143 86 92
		txa				;A145 8A
L_A146	sec				;A146 38
		rts				;A147 60
L_A148	lda ZP_B0		;A148 A5 B0
		cmp ZP_B2		;A14A C5 B2
		lda ZP_B1		;A14C A5 B1
		sbc ZP_B3		;A14E E5 B3
		bcc L_A153		;A150 90 01
		rts				;A152 60
L_A153	ldx ZP_91		;A153 A6 91
		lda L_AD00,X	;A155 BD 00 AD
		tax				;A158 AA
		lda L_A3D0,X	;A159 BD D0 A3
		sta (ZP_80),Y	;A15C 91 80
		inc ZP_B0		;A15E E6 B0
		bne L_A164		;A160 D0 02
		inc ZP_B1		;A162 E6 B1
L_A164	clc				;A164 18
		rts				;A165 60
L_A166	ldx L_AC00		;A166 AE 00 AC
		lda #$FF		;A169 A9 FF
		sta L_AC00		;A16B 8D 00 AC
		jmp L_A30A		;A16E 4C 0A A3
L_A171	ldx ZP_94		;A171 A6 94
L_A173	stx L_A1A3		;A173 8E A3 A1

		jmp L_A1A2
		
door_pushed	mva #$ff repeat_delay_first ;do not pause when switch
		jmp L_A173


L_A1A2	ldx #$00		;A1A2 A2 00
L_A1A3	equ *-1			;!
		lda L_AF00_playfield,X	;A1A4 BD 00 AF
		and #$3F		;A1A7 29 3F
		tay				;A1A9 A8
		lda element_types,Y	;A1AA B9 00 5D
		and #$02		;A1AD 29 02
		bne L_A1B2		;A1AF D0 01
		rts				;A1B1 60
L_A1B2	lda L_AE00,X	;A1B2 BD 00 AE
		beq L_A1B8		;A1B5 F0 01
		rts				;A1B7 60
L_A1B8	lda #$03		;A1B8 A9 03
		sta L_AE00,X	;A1BA 9D 00 AE
		rts				
		
L_A1BE_update_playfield	ldx #$00		;A1BE A2 00
L_A1C0	lda L_AE00,X	;A1C0 BD 00 AE
		beq L_A1F3		;A1C3 F0 2E
		stx L_A1E2		;A1C5 8E E2 A1
		lda L_AF00_playfield,X	;A1C8 BD 00 AF
		and #$3F		;A1CB 29 3F
		sec				;A1CD 38
		sbc #$20		;A1CE E9 20
		asl @			;A1D0 0A
		tay				;A1D1 A8
		lda element_routine_lookup,Y	;A1D2 B9 4C A3
		sta L_A1DF		;A1D5 8D DF A1
		lda element_routine_lookup+1,Y	;A1D8 B9 4D A3
		sta L_A1E0		;A1DB 8D E0 A1
L_A1DE	jsr L_A1DE		;A1DE 20 DE A1
L_A1DF	equ *-2			;!
L_A1E0	equ *-1			;!
		ldx #$00		;A1E1 A2 00
L_A1E2	equ *-1			;!
		dec L_AE00,X	;A1E3 DE 00 AE
		lda L_AE00,X	;A1E6 BD 00 AE
		bne L_A1F3		;A1E9 D0 08
		lda L_AF00_playfield,X	;A1EB BD 00 AF
		and #$7F		;A1EE 29 7F
		sta L_AF00_playfield,X	;A1F0 9D 00 AF
L_A1F3	inx				;A1F3 E8
		cpx #$C0		;A1F4 E0 C0
		bcc L_A1C0		;A1F6 90 C8
		ldx ZP_B5		;A1F8 A6 B5
		cpx #$FF		;A1FA E0 FF
		bne L_A1FF		;A1FC D0 01
L_A1FE	rts				;A1FE 60
L_A1FF	lda ZP_B6_disks_to_collect		;A1FF A5 B6
		bpl L_A1FE		;A201 10 FB
		lda ZP_B7_lenses_to_destroy		;A203 A5 B7
		bpl L_A1FE		;A205 10 F7
		lda L_AF00_playfield,X	;A207 BD 00 AF
		and #$7F		;A20A 29 7F
		tay				;A20C A8
		cpy #$34		;A20D C0 34
		bcs L_A212		;A20F B0 01
		iny				;A211 C8
L_A212	tya				;A212 98
		sta L_AF00_playfield,X	;A213 9D 00 AF
		rts				;A216 60
		
L_A217
		txa				;A230 8A
		ldy #$03		;A231 A0 03
L_A233		cmp L_BFB0_switch_positions,Y	;A233 D9 B0 BF
		beq L_A23C		;A236 F0 04
		dey				;A238 88
		bpl L_A233		;A239 10 F8
		rts				;A23B 60
L_A23C		sty L_A256		;A23C 8C 56 A2

L_A255		ldy #$00		;A255 A0 00
L_A256		equ *-1			;!
		lda L_AF00_playfield,X	;A257 BD 00 AF
		bpl L_A280		;A25A 10 24
		lda #$04		;A25C A9 04
		sta L_AE00,X	;A25E 9D 00 AE
		tya				;A261 98
		tax				;A262 AA
		lda door_opening_phase,X	;A263 BD 09 A0
		cmp #$03		;A266 C9 03
		bcs L_A27F		;A268 B0 15
		inc door_opening_phase,X	;A26A FE 09 A0
		lda door_opening_phase,X	;A26D BD 09 A0
		ldy L_BFB4_door_positions,X	;A270 BC B4 BF
		clc				;A273 18
		adc #$11		;A274 69 11
		cmp #$14		;A276 C9 14
		bcc L_A27C		;A278 90 02
		lda #$00		;A27A A9 00
L_A27C		sta L_AF00_playfield,Y	;A27C 99 00 AF
L_A27F		rts				;A27F 60
L_A280		tya				;A280 98
		tax				;A281 AA
		lda door_opening_phase,Y	;A282 B9 09 A0
		bne L_A288		;A285 D0 01
xoxo		rts				;A287 60
L_A288		dec door_opening_phase,X	;A288 DE 09 A0
		lda door_opening_phase,X	;A28B BD 09 A0
		pha				;A28E 48
		lda L_BFB4_door_positions,Y	;A28F B9 B4 BF
		tay				;A292 A8
		clc				;A293 18
		pla				;A294 68
		adc #$11		;A295 69 11
		sta L_AF00_playfield,Y	;A297 99 00 AF
		rts				;A29A 60
L_A29B	lda #$2B		;A29B A9 2B
		bne L_A2B6		;A29D D0 17
l_a29f		lda #$2C		;A29F A9 2C
		bne L_A2B6		;A2A1 D0 13
l_a2a3		lda #$04		;A2A3 A9 04
		sta L_AE00,X	;A2A5 9D 00 AE
		lda #$2D		;A2A8 A9 2D
		bne L_A2B6		;A2AA D0 0A
l_a2ac		lda #$2E		;A2AC A9 2E
		bne L_A2B6		;A2AE D0 06
l_a2b0		lda #$2F		;A2B0 A9 2F
		bne L_A2B6		;A2B2 D0 02
l_a2b4		lda #$00		;A2B4 A9 00
L_A2B6		sta L_AF00_playfield,X	;A2B6 9D 00 AF
		rts				;A2B9 60
L_A2BA		lda #$36		;A2BA A9 36
		bne L_A2B6		;A2BC D0 F8
l_a2be		lda #$37		;A2BE A9 37
		bne L_A2B6		;A2C0 D0 F4
l_a2c2		lda #$38		;A2C2 A9 38
		bne L_A2B6		;A2C4 D0 F0
l_a2c6		dec ZP_B7_lenses_to_destroy		;A2C6 C6 B7
		lda #$00		;A2C8 A9 00
		beq L_A2B6		;A2CA F0 EA
L_a2cc		ldy L_AD00		;A2CC AC 00 AD
		iny				;A2CF C8
		cpy #$08		;A2D0 C0 08
		bcc L_A2D6		;A2D2 90 02
		ldy #$00		;A2D4 A0 00
L_A2D6	sty L_AD00		;A2D6 8C 00 AD
		rts				;A2D9 60
L_A2DA	lda #$E0		;A2DA A9 E0
		sta ZP_A8		;A2DC 85 A8
		lda #$00		;A2DE A9 00
		beq L_A2B6		;A2E0 F0 D4
l_a2e2		jsr L_A30A		;A2E2 20 0A A3
;when bomb is hit by laser then random piece explodes:
L_A2E5	lda random		;A2E5 AD 0A D2
		and #$BF		;A2E8 29 BF
		tax				;A2EA AA
		lda L_AF00_playfield,X	;A2EB BD 00 AF
		and #$7F		;A2EE 29 7F
		beq L_A2E5		;A2F0 F0 F3
		cmp #$10		;A2F2 C9 10
		bcc L_A30A		;A2F4 90 14
		cmp #$14		;A2F6 C9 14
		bcc L_A2E5		;A2F8 90 EB
		cmp #$26		;A2FA C9 26
		beq L_A2E5		;A2FC F0 E7
		cmp #$30		;A2FE C9 30
		bcc L_A30A		;A300 90 08
		cmp #$35		;A302 C9 35
		beq L_A30A		;A304 F0 04
		cmp #$39		;A306 C9 39
		bcc L_A2E5		;A308 90 DB
L_A30A	lda #$2B		;A30A A9 2B
		sta L_AF00_playfield,X	;A30C 9D 00 AF
		jmp L_A173		;A30F 4C 73 A1
L_A312	txa				;A312 8A
		ldx #$07		;A313 A2 07
L_A315	cmp L_BFB8,X	;A315 DD B8 BF
		beq L_A31E		;A318 F0 04
		dex				;A31A CA
		bpl L_A315		;A31B 10 F8
		rts				;A31D 60
L_A31E	lda #$E9		;A31E A9 E9
		cpx #$04		;A320 E0 04
		bcs L_A326		;A322 B0 02
		lda #$69		;A324 A9 69
L_A326	sta L_A32A		;A326 8D 2A A3
		txa				;A329 8A
L_A32A	sbc #$04		;A32A E9 04
		tax				;A32C AA
		lda L_BFB8,X	;A32D BD B8 BF
		ldy ZP_92		;A330 A4 92
		sta L_AC00,Y	;A332 99 00 AC
		ldx ZP_91		;A335 A6 91
		lda L_AD00,X	;A337 BD 00 AD
		sta L_AD00,Y	;A33A 99 00 AD
		iny				;A33D C8
		sty ZP_92		;A33E 84 92
		rts				;A340 60
L_A341	lda ZP_B0		;A341 A5 B0
		sta ZP_B2		;A343 85 B2
		lda ZP_B1		;A345 A5 B1
		sta ZP_B3		;A347 85 B3
		jmp L_A30A		;A349 4C 0A A3
element_routine_lookup		
		dta a(return)
		dta a(return)
		dta a(L_A341)
		dta a(L_A217)	
		dta a(L_a2cc)
		dta a(L_A2DA)
		dta a(L_A312)
		dta a(l_a2e2)
		dta a(return)
		dta a(return)
		dta a(L_A29B)
		dta a(l_a29f)
		dta a(l_a2a3)
		dta a(l_a2ac)
		dta a(l_a2b0)
		dta a(l_a2b4)
		dta a(return)
		dta a(return)
		dta a(return)
		dta a(return)
		dta a(return)
		dta a(L_A2BA)
		dta a(l_a2be)
		dta a(l_a2c2)
		dta a(l_a2c6)
		dta a(return)
		dta a(return)
		dta a(return)
		dta a(return)
		dta a(return)
		dta a(return)
		dta a(return)
L_A38C	dta $00			;A38C 00    
L_A38D	dta $01			;A38D 01   !
L_A38E	dta $00			;A38E 00    
L_A38F	dta $05			;A38F 05   %
L_A390	dta $01,$00,$29,$01,$28,$29,$00,$28
L_A398	dta $02,$05,$07,$04,$04,$07,$01,$06,$06,$01,$03,$00,$00,$03,$05,$02
L_A3A8	dta $FF,$F0,$01,$F0,$F0,$01,$10,$01,$01,$10,$FF,$10,$10,$FF,$F0,$FF
L_A3B8	dta $D8,$D8,$D8,$28,$28,$28,$28,$D8
L_A3C0	dta $FF,$FF,$FF,$00,$00,$00,$00,$FF
L_A3C8	dta $FF,$01,$01,$01,$01,$FF,$FF,$FF
L_A3D0	dta $03,$02,$02,$05,$05,$04,$04,$03,$00,$00,$00,$00,$00,$00,$00,$00
		dta $00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00
		dta $00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00

	org $a400
;A400 - ingame tiles font1 (top line)
tilesfont1
	IFT C_PG_STYLE = 1
		ins 'new_tiles\a400_pg_tiles_1.fnt'
	ELS
		ins 'a400_ingame1.fnt'
	EIF
L_A410_laser_tile_top1	equ tilesfont1+$10
L_A420_laser_tile_top2	equ tilesfont1+$20
tilesfont2	
;A800 - ingame tiles font2 (bottom line)
	IFT C_PG_STYLE = 1
		ins 'new_tiles\a800_pg_tiles_2.fnt'
	ELS
		ins 'a800_ingame2.fnt'
	EIF
L_A810_laser_tile_bottom1	equ tilesfont2+$10
L_A820_laser_tile_bottom2	equ tilesfont2+$20

		guard $ac00	
;end of ingame tile fonts
L_AC00		equ $ac00
L_AD00		equ $ad00
;some displaylist data ?
L_AE00		equ $ae00    
L_AE01		equ L_AE00+1
L_AF00_playfield	equ $af00
L_AFC0		equ L_AF00_playfield+$c0
L_AFC8		equ L_AF00_playfield+$c8
L_AFD0		equ L_AF00_playfield+$d0
L_AFD1		equ L_AF00_playfield+$d1
L_AFD2		equ L_AF00_playfield+$d2
L_AFD3		equ L_AF00_playfield+$d3

L_B000		equ $b000
L_B100		equ $b100
L_B200		equ $b200
;missile data (missiles are not used during gameplay)
L_B300_missile_data	equ $b300
;data player0 - yellow part of tank
L_B400_player0_data	equ $b400
;data player1 - pink part of tank
L_B500_player1_data	equ $b500
;data player2 - red right-bottom edge of box (pushed by tank)
L_B600_player2_data	equ $b600
;data player3 - green filling of box (pushed by tank) 
L_B700_player3_data	equ $b700
L_B800_gamevram	equ $b800
L_B900		equ $b900
L_BA00		equ $ba00
;other missile data
L_BB00		equ $bb00
L_BBC0		equ L_BB00+$c0
;other Player 0-4 data
;also vram for titlescreen animation
L_BC00		equ $bc00
L_BCC0		equ L_BC00+$c0
L_BD00		equ $bd00
;vram for init logo
L_BDC0		equ L_BD00+$c0
L_BE00		equ $be00
L_BE6E		equ L_BE00+$6e
L_BEC0		equ L_BE00+$c0
L_BEEE		equ L_BE00+$ee
L_BF00		equ $bf00
L_BF6E		equ L_BF00+$6e
L_BF80_box_sprite_p2	equ L_BF00+$80
L_BF90_box_sprite_p3	equ L_BF00+$90
L_BFA0_box_sprite_m		equ L_BF00+$a0
L_BFB0_switch_positions	equ L_BF00+$b0
L_BFB4_door_positions	equ L_BF00+$b4
L_BFB8			equ L_BF00+$b8
L_BFEE			equ L_BF00+$ee

hposp0	equ $D000
hposp1	equ $D001
hposp2	equ $D002
hposp3	equ $D003
hposm0	equ $D004
hposm1	equ $D005
hposm2	equ $D006
hposm3	equ $D007
sizep0	equ $D008
sizem	equ $D00C	;size of all missiles
trig0	equ $D010
trig1	equ $D011
colpm0	equ $D012
colpf0	equ $D016
colpf1	equ $D017
colpf2	equ $D018
colpf3	equ $D019
colbk	equ $D01A
prior	equ $D01B
gractl	equ $D01D
consol	equ $D01F
audf1	equ $D200
audc1	equ $D201
audctl	equ $D208
kbcode	equ $D209
random	equ $D20A
skstat	equ $D20F	;keyboard status  ,(W)#3 -reset pokey after i/o 
porta	equ $D300
portb	equ $D301
pactl	equ $D302 ;casette motor control
dmactl	equ $D400
dlistl	equ $D402
dlisth	equ $D403
vscrol	equ $D405
pmbase	equ $D407
chbase	equ $D409
wsync	equ $D40A
vcount	equ $D40B
nmien	equ $D40E
L_E456	equ $E456
L_E471	equ $E471
L_F556	equ $F556
;
;--------------------------------
;
