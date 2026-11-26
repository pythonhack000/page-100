# Page content and layouts

Content mockups for every page, rows 1-22 (row 0 is the header, row 23 is Fastext). Each row is at most 40 characters. `DH` = double-height (takes two rows). `~` = a note about mosaic graphics, not literal text. Example data values are placeholders; live values come from the data build.

## 100 Index (with a TODAY strip)

The index opens with a TODAY strip so the first screen already answers the morning questions without a single keypress: USD to somoni and the weather in Dushanbe. Values come from the same p400/p500 JSON (two small fetches). If the data is missing, the strip shows 'no signal' in Red instead of breaking the page.

```
01 |PAGE 100                                | Cyan (double-height)
02 |(bottom half)                           |
03 |~mosaic band, Cyan/Yellow               | Cyan
04 |                                        | 
05 |TODAY  DUSHANBE        +7C  clear       | Yellow
06 |       1 USD = 10.94 TJS  up            | Yellow
07 |                                        | 
08 |CONTENTS                                | White
09 |                                        | 
10 |101  News headlines                     | Red
11 |400  Weather                            | Green
12 |500  Exchange rates                     | Yellow
13 |666  ???                                | Magenta
14 |888  About                              | Cyan
15 |                                        | 
16 |                                        | 
17 |About 1 KB a page. Works on 2G.         | Green
18 |                                        |
19 |                                        |
20 |                                        |
21 |                                        |
22 |                                        |
```

Fastext: red 101 News, green 400 Wthr, yellow 500 Rates, cyan 888 About

## 101 News headlines (template for 101-109, subpages 1/N)

Data: public/data/p101.json. One feed per page 101-109. Subpage = 4 headlines. Headline wraps to max 3 lines, word-wrapped, never cut mid-word.

```
01 |NEWS  101           1/3                 | Yellow (double-height)
02 |(bottom half)                           |
03 |~mosaic band, Red                       | Red
04 |                                        | 
05 |WORLD                                   | Cyan
06 |Talks resume on regional water deal     | White
07 |after two days of delay                 | White
08 |                                        | 
09 |Markets steady as fuel prices ease      | White
10 |                                        | 
11 |New rail link to open next spring,      | White
12 |ministry says                           | White
13 |                                        | 
14 |Storm warning for mountain passes       | White
15 |tonight                                 | White
16 |                                        | 
17 |                                        | 
18 |                                        | 
19 |                                        | 
20 |Source: <feed name>   Updated 14:30     | Green
21 |More news on 102   Index 100            | Cyan
22 |                                        |
```

Fastext: red 100 Index, green 102 Next, yellow 400 Wthr, cyan 500 Rates

## 400 Weather

Data: public/data/p400.json from Open-Meteo. Default city Dushanbe; the city is picked on page 401 (list of 9 cities, digit 1-9). Mosaic icon 6x3 cells to the left of the temperature: sun (Yellow), cloud (White), rain (Cyan drops), snow (White dots).

```
01 |WEATHER  DUSHANBE                       | Yellow (double-height)
02 |(bottom half)                           |
03 |~mosaic band, Blue                      | Blue
04 |                                        | 
05 |~icon       NOW   +7C  CLEAR            | White
06 |~icon             wind 3 m/s            | White
07 |~icon             humidity 61%          | White
08 |                                        | 
09 |TODAY     max +11   min  +2   sun       | Green
10 |TOMORROW  max  +9   min  +1   cloud     | Green
11 |FRI       max  +4   min  -2   rain      | Cyan
12 |SAT       max  +3   min  -4   snow      | White
13 |SUN       max  +6   min  -1   sun       | Green
14 |                                        | 
15 |                                        | 
16 |                                        | 
17 |                                        | 
18 |Other city: page 401                    | Cyan
19 |Data: Open-Meteo        Updated 14:30   | Green
20 |                                        | 
21 |                                        | 
22 |                                        |
```

Fastext: red 100 Index, green 401 City, yellow 500 Rates, cyan 888 About

## 500 Exchange rates

Data: public/data/p500.json from open.er-api.com. Base is TJS first (local readers), then USD. Arrow = change since the previous build: up Green, down Red, flat White.

```
01 |RATES  500                              | Yellow (double-height)
02 |(bottom half)                           |
03 |~mosaic band, Green                     | Green
04 |                                        | 
05 |1 UNIT IN TAJIK SOMONI                  | Cyan
06 |                                        | 
07 |USD   US dollar          10.94  up      | White
08 |EUR   Euro               11.82  down    | White
09 |RUB   Russian rouble      0.137 flat    | White
10 |CNY   Chinese yuan        1.51  up      | White
11 |KZT   Kazakh tenge        0.021 flat    | White
12 |UZS   Uzbek sum (1000)    0.86  down    | White
13 |                                        | 
14 |1 US DOLLAR IN                          | Cyan
15 |                                        | 
16 |EUR 0.92   GBP 0.79   JPY 151.2         | White
17 |TRY 34.1   INR 84.3   AED 3.67          | White
18 |                                        | 
19 |Data: open.er-api.com  Updated 14:30    | Green
20 |Rates are indicative, not for trading   | Red
21 |                                        | 
22 |                                        |
```

Fastext: red 100 Index, green 101 News, yellow 400 Wthr, cyan 888 About

## 666 The ghost of the broadcast (3 subpages, cycling)

Subpages cycle every 8 s like any other page, but between subpages the screen rolls (vertical hold slip) and shows a ghost frame of the previous page. Row noise: on each tick 1-3 random cells flip to a random mosaic. Concealed text (fg = bg) holds the easter egg; pressing REVEAL (key `?` or the on-screen REVEAL button) shows it, exactly like the reveal button on old remotes. Hidden page 999 is reachable only from the revealed text.

```
01 |LAST TRANSMISSION                       | Red (double-height)
02 |(bottom half)                           |
03 |~mosaic band, broken: random gaps       | Red
04 |                                        | 
05 |THIS SERVICE CLOSED AT 03:00            | White
06 |ON THE NIGHT THE SIGNAL WENT DIGITAL.   | White
07 |                                        | 
08 |THE PAGES WERE NEVER SWITCHED OFF.      | White
09 |THEY ARE STILL BEING TRANSMITTED        | White
10 |TO SETS THAT NO LONGER EXIST.           | White
11 |                                        | 
12 |IF YOU CAN READ THIS,                   | Yellow
13 |YOUR SET IS ONE OF THEM.                | Yellow
14 |                                        | 
15 |                                        | 
16 |  NOBODY IS WATCHING  NOBODY IS WATC    | Magenta
17 |                                        | 
18 |[concealed] PRESS REVEAL                | Black
19 |                                        | 
20 |                                        | 
21 |                                        | 
22 |                                        |
```

Fastext: red 100 Index, green 666 ..., yellow 666 ..., cyan 666 ...

## 666 subpage 2/3

Weather and news from the night it closed, frozen. Same layout as 400/101 so it reads as a real old page, but the date is wrong and the clock in the header runs backwards while this subpage is shown.

```
01 |WEATHER  NOWHERE                        | Yellow (double-height)
02 |(bottom half)                           |
03 |~mosaic band, Blue, flickers            | Blue
04 |                                        | 
05 |NOW   -273C   STATIC                    | White
06 |                                        | 
07 |TONIGHT    snow on every channel        | Cyan
08 |TOMORROW   there is no tomorrow         | Cyan
09 |                                        | 
10 |NEWS                                    | Cyan
11 |Viewers asked to stay tuned             | White
12 |Transmitter left running, staff gone    | White
13 |Page 999 'not for broadcast'            | White
14 |                                        | 
15 |                                        | 
16 |                                        | 
17 |                                        | 
18 |                                        | 
19 |Updated 03:00   Updated 03:00   Upd     | Green
20 |                                        | 
21 |                                        | 
22 |                                        |
```

Fastext: red 100 Index, green 666 ..., yellow 666 ..., cyan 666 ...

## 666 subpage 3/3

Almost empty: the ghost frame. Large mosaic face (eyes + mouth, White on Black) drawn in rows 6-15, centred, about 16 cells wide. Text fades in one character per tick.

```
01 |                                        | 
02 |                                        | 
03 |                                        | 
04 |                                        | 
05 |~mosaic face rows 5-14                  | White
06 |                                        | 
07 |                                        | 
08 |                                        | 
09 |                                        | 
10 |                                        | 
11 |                                        | 
12 |                                        | 
13 |                                        | 
14 |                                        | 
15 |                                        | 
16 |          I KEPT YOUR PAGE              | White
17 |                                        | 
18 |[concealed] 999                         | Black
19 |                                        | 
20 |                                        | 
21 |                                        | 
22 |                                        |
```

Fastext: red 100 Index

## 999 Not for broadcast (hidden)

Reachable only by typing 999 after REVEAL on 666. Not listed on 100, not in Fastext, not in arrow-key next/prev order. Shows the viewer's own visit: first visit time from localStorage (wrapped in try/catch, works without it), number of pages viewed this session. Then a fake 'channel closedown' card and the screen collapses to a white dot.

```
01 |NOT FOR BROADCAST                       | Red (double-height)
02 |(bottom half)                           |
03 |                                        | 
04 |                                        | 
05 |YOU FIRST TUNED IN AT 14:02.            | White
06 |YOU HAVE TURNED 23 PAGES TONIGHT.       | White
07 |                                        | 
08 |WE KNEW YOU WOULD COME BACK.            | Yellow
09 |EVERYONE COMES BACK TO PAGE 100.        | Yellow
10 |                                        | 
11 |                                        | 
12 |                                        | 
13 |    THANK YOU FOR WATCHING              | Cyan
14 |    TRANSMISSION ENDS                   | Cyan
15 |                                        | 
16 |                                        | 
17 |                                        | 
18 |                                        | 
19 |                                        | 
20 |                                        | 
21 |                                        | 
22 |                                        |
```

Fastext: red 100 Index

## 888 About

Page weight counter is real: sizes come from public/data/weights.json written by the data build (bytes per page JSON). Each line Green if under 2048 bytes, Red if over. Row 20 is concealed: REVEAL (`?`) shows 'CALL THE STATION: 777'. Page 777 is a one-screen card that opens the Answering Machine call page (the second Kiroween entry) in a new tab after a 3 s 'dialling...' animation. The URL comes from one constant so it can be filled in once that site is live.

```
01 |ABOUT  888                              | Yellow (double-height)
02 |(bottom half)                           |
03 |~mosaic band, Cyan                      | Cyan
04 |                                        | 
05 |Teletext, back from the dead.           | White
06 |News, weather and rates in about 1 KB   | White
07 |a page. Made for 2G, for metered        | White
08 |data, for a phone on its last megabyte. | White
09 |                                        | 
10 |PAGE WEIGHT                             | Cyan
11 |100  index ............   612 bytes     | Green
12 |101  news .............  1480 bytes     | Green
13 |400  weather ..........   904 bytes     | Green
14 |500  rates ............   731 bytes     | Green
15 |Whole service today .....  9.8 KB       | White
16 |                                        | 
17 |No server. No trackers. No ads.         | White
18 |Open source, MIT licence.               | White
19 |Built with Kiro.                        | Magenta
20 |                                        | 
21 |[concealed] CALL THE STATION: 777       | Black
22 |                                        |
```

Fastext: red 100 Index, green 101 News, yellow 666 ???, cyan 500 Rates

## Known renderer bug for Kiro (found 2026-11-26 in a real browser)
Navigate 100 -> 400 (not found) -> 100: the mosaic band on row 3 is gone. `applyCell` writes `span.textContent = cell.char` for a text cell, which deletes the six `.tt-six` children of a cell that was a mosaic before. `MountedCell.sixSpans` still points at the detached spans, so going back to a mosaic toggles elements that are no longer in the DOM. Fix: when a cell turns from mosaic to text, reset `sixSpans` to null (or rebuild if the children are detached), and add a test that renders mosaic -> text -> mosaic on the same cell.
