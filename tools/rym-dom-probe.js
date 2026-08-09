/**
 * RYM DOM probe — run this yourself, in your own browser, on a RYM release page.
 *
 * Why you and not the agent: rateyourmusic.com serves a Cloudflare Turnstile
 * "Verify you are human" challenge to automation-driven browsers. Your normal
 * logged-in session passes without one. This script only reads the page that is
 * already on your screen — no navigation, no requests, no writes.
 *
 * HOW TO RUN
 *   1. Open any RYM release page, e.g.
 *        https://rateyourmusic.com/release/album/radiohead/kid-a/
 *   2. F12 → Console.
 *   3. Paste this whole file, press Enter.
 *   4. It copies a JSON report to your clipboard (and prints it). Paste it back.
 *
 * WHAT IT COLLECTS
 *   Selectors and the shape of the values (lengths, formats, counts) plus the
 *   small factual values needed to write the capture code: rating, rating count,
 *   genres, descriptors, canonical URL. Run it on a release you have rated if
 *   you want the "your own rating" selector resolved too.
 *
 * It does NOT collect your username, email, cookies, or any page you haven't
 * opened. Read it before you run it.
 */

(() => {
	const report = { probeVersion: 2, url: location.href, ranAt: new Date().toISOString() };

	const text = (el) => (el?.textContent ?? "").trim().replace(/\s+/g, " ");

	/** Records every selector that matched, so we learn which ones are real. */
	const probe = (label, selectors) => {
		const hits = [];
		for (const selector of selectors) {
			let nodes = [];
			try {
				nodes = [...document.querySelectorAll(selector)];
			} catch {
				continue;
			}
			if (!nodes.length) continue;
			hits.push({
				selector,
				count: nodes.length,
				samples: nodes.slice(0, 6).map((n) => text(n).slice(0, 120)).filter(Boolean),
			});
		}
		report[label] = hits;
	};

	probe("rating", [
		".avg_rating",
		"[class*=avg_rating]",
		".release_avg_rating",
		"span.avg_rating",
		"[itemprop=ratingValue]",
	]);

	probe("ratingCount", [
		".num_ratings",
		"[class*=num_ratings]",
		"[itemprop=ratingCount]",
		"[itemprop=reviewCount]",
	]);

	probe("genres", [
		".release_pri_genres",
		".release_sec_genres",
		"[class*=release_pri_genres] a",
		"[class*=release_sec_genres] a",
		"a.genre",
		"[class*=genre] a",
	]);

	probe("descriptors", [".release_descriptors", "[class*=descriptor]"]);

	probe("titleAndArtist", [
		".album_title",
		"[class*=album_title]",
		".artist",
		"a.artist",
		"[itemprop=byArtist]",
		"h1",
	]);

	probe("yourRating", [
		"#my_catalog_rating",
		"[class*=my_catalog]",
		"[class*=your_rating]",
		".catalog_rating",
		"#catalog_rating",
	]);

	probe("releaseMeta", [
		".release_date",
		"[class*=release_date]",
		".issue_year",
		".release_type",
		"[class*=chart_position]",
		"[class*=release_chart_position]",
	]);

	// The canonical URL is the single most valuable field: it is how wrong links
	// get repaired, including RYM's -2 / -15 disambiguation suffixes that cannot
	// be derived from Spotify metadata by any means.
	report.canonical = {
		linkRelCanonical:
			document.querySelector('link[rel=canonical]')?.getAttribute("href") ?? null,
		ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute("content") ?? null,
		locationPath: location.pathname,
	};

	// Structured data would make the whole capture trivial and version-proof.
	report.structuredData = [...document.querySelectorAll('script[type="application/ld+json"]')]
		.map((s) => {
			try {
				return JSON.parse(s.textContent || "{}");
			} catch {
				return { parseError: true, raw: (s.textContent || "").slice(0, 200) };
			}
		})
		.slice(0, 4);

	// Any stable id/data-* hook is worth more than a class name, which RYM churns.
	report.dataAttributes = [
		...new Set(
			[...document.querySelectorAll("[data-album-id], [data-asin], [id^=album], [id^=release]")]
				.slice(0, 25)
				.map(
					(el) =>
						`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}[${[...el.attributes]
							.filter((a) => a.name.startsWith("data-"))
							.map((a) => a.name)
							.join(",")}]`,
				),
		),
	];

	report.isLoggedIn = Boolean(
		document.querySelector("#header_profile_username, [href*='/~'], .header_profile"),
	);

	const json = JSON.stringify(report, null, 2);
	console.log(json);
	try {
		copy(json); // DevTools console helper
		console.log("%c✔ copied to clipboard — paste it back to Claude", "color:#1db954");
	} catch {
		console.log("Select the JSON above and copy it manually.");
	}
	return report;
})();
