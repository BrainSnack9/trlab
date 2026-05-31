# TrLab content validation report

Date: 2026-05-30

## What was tested

The dashboard was loaded with the current local SQLite signal data and the keyword candidates were passed through the new content validation layer.

The validator scores each candidate with:

- Trend strength: burst, recency, repetition, and source diversity.
- Content usability: context clarity, visual potential, evergreen value, and content type.
- Risk control: single-source penalty, weak phrase penalty, sensitive-topic penalty, and vague wording penalty.

## Current real-data result

Top 12 candidates after validation:

| Rank | Keyword | Grade | Fit | Suggested angle |
| --- | --- | --- | --- | --- |
| 1 | 하지원 홈런 | A | 96 | 사람들이 반응한 포인트 |
| 2 | 이승기 | B | 74 | 사람들이 반응한 포인트 |
| 3 | 팔란티어 | A | 90 | 왜 지금 다시 주목받나 |
| 4 | 인플레이션 | A | 84 | 왜 지금 다시 주목받나 |
| 5 | 두산베어스 만루홈런 | B | 70 | 사람들이 반응한 포인트 |
| 6 | 코스피 카카오 | B | 75 | 왜 지금 다시 주목받나 |
| 7 | 관광객 낙수효과 | B | 70 | 소비 변화 |
| 8 | 젠더리스 아이돌 | C | 60 | 반응 포인트 |
| 9 | 일본인 이해하지 | D | 50 | reject / weak phrase |
| 10 | 타버린 축구선수 | B | 68 | verify first |
| 11 | 예전에 재업한 | D | 37 | reject / weak phrase |
| 12 | 한혜진 기성용 | C | 55 | verify first |

## Cold review

This is now usable as a content-candidate filter, not yet as a fully automatic card-news factory.

Production-ready candidates from the current batch:

- 팔란티어: good explanatory topic. Needs search-result verification, but suitable for an informative card-news draft.
- 인플레이션: good explanatory topic. Broad and evergreen enough for card-news.
- 코스피 카카오: usable after fact-checking. Good market/story angle.
- 관광객 낙수효과: useful for local commerce / travel / consumer insight content.

Needs human or search verification before production:

- 하지원 홈런: high signal, but possible context ambiguity.
- 이승기: trend exists, but too broad until search context explains why.
- 두산베어스 만루홈런: good reaction topic, but short-lived sports content.
- 젠더리스 아이돌: potentially usable, but sensitive framing risk.

Reject or deprioritize:

- 일본인 이해하지
- 예전에 재업한
- Any phrase-like candidate that sounds like a broken sentence rather than a topic.

## Next improvement

The next layer should fetch Google/Naver search results for selected candidates, summarize the reason for the trend, and only then allow card-news generation. The current detector can tell what to inspect; it cannot yet guarantee that the topic has enough verified context.
