;both dumps are created by adding breakpoint to PC=6900 ...
;dumpsize: 0300-cxxx 

	org $0300
	;ins 'lmdump_hax0300'	;dump of my old working version
	ins 'lmdump0300'			;dump from original loaded casette version
	run $6900
