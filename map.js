/* =========================================================
 * 행사장 지도 배경 (SVG)
 *  - 하만전 지도/map.png 를 선·면·글자로 따서 만든 벡터입니다.
 *  - 색은 styles.css 의 --map-ink / --map-zone / --map-bg 로 바꿉니다.
 *  - 그룹: m-zone(연보라 영역) m-block(벽·채워진 면, 하나의 path) m-line(사선 벽)
 *          m-seat(좌석) m-arrow(동선 화살표) m-text(글자)
 *  - 같은 내용의 독립 SVG 파일: assets/map.svg
 * ========================================================= */
const MAP = { width: 1680, height: 1020 };
const MAP_LAYER = `
<g class="m-zone">
<rect x="1261" y="261" width="399" height="178"/>
</g>
<g class="m-block">
<path d="M17 19H20V484H17zM17 548H20V676H17zM341 673H344V762H341zM679 19H682V344H679zM755 19H758V261H755zM901 727H904V1005H901zM1021 19H1024V261H1021zM1163 933H1166V1006H1163zM1201 438H1204V591H1201zM1201 642H1204V676H1201zM1201 786H1204V936H1201zM1281 786H1284V936H1281zM1281 438H1284V676H1281zM1315 933H1318V1006H1315zM1369 19H1372V261H1369zM1659 258H1662V730H1659zM17 19H690V22H17zM747 19H1372V22H747zM755 258H778V261H755zM1001 258H1024V261H1001zM1261 258H1662V261H1261zM17 341H35V344H17zM81 341H452V344H81zM498 341H682V344H498zM1346 413H1662V416H1346zM1082 438H1204V441H1082zM1281 438H1348V441H1281zM341 673H1204V676H341zM1281 673H1338V676H1281zM17 673H231V676H17zM680 727H1146V730H680zM1338 727H1662V730H1338zM310 759H344V762H310zM1163 933H1204V936H1163zM1281 933H1318V936H1281zM1163 1003H1204V1006H1163zM1280 1003H1318V1006H1280zM1261 20H1370V117H1261zM1261 117H1289V260H1261zM994 328H1011V344H994zM1171 328H1201V344H1171zM1571 328H1660V344H1571zM1346 414H1365V431H1346zM1443 414H1462V431H1443zM1537 414H1556V431H1537zM1629 344H1660V431H1629zM1346 431H1660V440H1346zM524 440H1084V675H524zM342 675H902V701H342zM680 701H902V728H680zM680 728H902V1005H680z"/>
<rect x="1548" y="493" width="44" height="129" rx="9"/>
<circle cx="1616.5" cy="518.5" r="8.5"/>
<circle cx="1616.5" cy="544.5" r="8.5"/>
<circle cx="1616.0" cy="570.5" r="8.0"/>
<circle cx="1616.0" cy="597.0" r="8.0"/>
</g>
<g class="m-line">
<line x1="231" y1="674.5" x2="310" y2="760.5" stroke-width="3" stroke-linecap="square"/>
<line x1="1146" y1="728.5" x2="1202.5" y2="786" stroke-width="3" stroke-linecap="square"/>
<line x1="1338" y1="728.5" x2="1282.5" y2="786" stroke-width="3" stroke-linecap="square"/>
<line x1="498" y1="356" x2="471" y2="429" stroke-width="3"/>
</g>
<g class="m-seat">
<rect x="1386" y="455" width="16" height="16"/>
<rect x="1436" y="455" width="16" height="16"/>
<rect x="1486" y="455" width="17" height="16"/>
<rect x="1386" y="476" width="16" height="17"/>
<rect x="1436" y="476" width="17" height="17"/>
<rect x="1486" y="476" width="17" height="17"/>
<rect x="1386" y="498" width="16" height="16"/>
<rect x="1436" y="498" width="16" height="16"/>
<rect x="1486" y="498" width="16" height="16"/>
<rect x="1386" y="519" width="16" height="16"/>
<rect x="1436" y="519" width="16" height="16"/>
<rect x="1486" y="519" width="17" height="16"/>
<rect x="1386" y="541" width="16" height="16"/>
<rect x="1436" y="541" width="16" height="16"/>
<rect x="1486" y="541" width="16" height="16"/>
<rect x="1386" y="574" width="16" height="17"/>
<rect x="1436" y="574" width="16" height="17"/>
<rect x="1486" y="574" width="16" height="17"/>
<rect x="1386" y="596" width="16" height="16"/>
<rect x="1436" y="596" width="16" height="16"/>
<rect x="1486" y="596" width="16" height="16"/>
<rect x="1386" y="617" width="16" height="16"/>
<rect x="1436" y="617" width="16" height="16"/>
<rect x="1486" y="617" width="16" height="16"/>
<rect x="1386" y="638" width="16" height="17"/>
<rect x="1436" y="638" width="16" height="17"/>
<rect x="1486" y="638" width="16" height="17"/>
<rect x="1386" y="660" width="16" height="16"/>
<rect x="1436" y="660" width="16" height="16"/>
<rect x="1486" y="660" width="16" height="16"/>
</g>
<g class="m-arrow">
<polygon points="709,42 727,42 718,26"/>
<polygon points="466,348 484,348 475,333"/>
<polygon points="232,381 232,399 247,390"/>
<polygon points="1234,467 1252,467 1243,452"/>
<polygon points="54,519 71,519 62.5,504"/>
<polygon points="488,506 505,506 496.5,521"/>
<polygon points="237,619 237,636 222,627.5"/>
<polygon points="1234,674 1251,674 1242.5,658"/>
<polygon points="1307,695 1307,713 1322,704"/>
<polygon points="1233,933 1251,933 1242,918"/>
</g>
<g class="m-text">
<text x="718" y="80" font-size="17" text-anchor="middle">출구</text>
<text x="1241" y="975" font-size="17" text-anchor="middle">입구</text>
<text x="1460" y="358" font-size="20" text-anchor="middle">위탁판매 팝업</text>
<text x="1142" y="548" font-size="15" text-anchor="middle">택배</text>
<text x="1142" y="567" font-size="15" text-anchor="middle">서비스</text>
<text x="1142" y="586" font-size="15" text-anchor="middle">접수</text>
<text x="1330" y="532" font-size="16" text-anchor="middle">공</text>
<text x="1330" y="553" font-size="16" text-anchor="middle">개</text>
<text x="1330" y="574" font-size="16" text-anchor="middle">방</text>
<text x="1330" y="595" font-size="16" text-anchor="middle">송</text>
</g>
`;
