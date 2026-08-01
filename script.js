const state = {
  page: 0,
  selectedFactor: "gdp",
  selectedCountry: "United States",
  selectedYear: 2019
};

const factorNames = {
  gdp: "GDP per person",
  support: "Social support",
  health: "Healthy life expectancy",
  freedom: "Freedom to make life choices",
  generosity: "Generosity",
  corruption: "Perceptions of corruption"
};

const pages = [
  {
    label: "THE LEADERS",
    title: "Northern Europe leads the 2019 ranking",
    copy: "Finland recorded the highest happiness score in 2019. Most countries near the top also ranked highly in social support, health, freedom, and trust."
  },
  {
    label: "THE CONDITIONS",
    title: "Income matters, but it does not tell the whole story",
    copy: "Countries with stronger economies usually report higher happiness. Still, countries with similar economic scores can have very different results because other parts of life also matter."
  },
  {
    label: "COUNTRY EXPLORATION",
    title: "Happiness can move in different directions over time",
    copy: "Choose a country and a measure to compare its happiness score with one condition from 2015 through 2019. Hover over a point to view the exact values."
  }
];

const svg = d3.select("#chart");
const tooltip = d3.select("#tooltip");
const chartArea = document.querySelector("#chartArea");
let data;

d3.csv("happiness.csv", d => ({
  country: d.country,
  region: d.region,
  rank: +d.rank,
  score: +d.score,
  gdp: +d.gdp,
  support: +d.support,
  health: +d.health,
  freedom: +d.freedom,
  generosity: +d.generosity,
  corruption: +d.corruption,
  year: +d.year
})).then(rows => {
  data = rows;
  buildSteps();
  bindButtons();
  render();
}).catch(error => {
  d3.select("#storyTitle").text("The data could not be loaded");
  d3.select("#storyCopy").text("Open this page through a web server so the data file can load correctly.");
  console.error(error);
});

function dimensions() {
  const width = Math.max(720, chartArea.clientWidth);
  const height = window.innerWidth < 760 ? 480 : 510;
  const margin = { top: 34, right: 58, bottom: 78, left: 88 };
  return { width, height, margin, innerWidth: width - margin.left - margin.right, innerHeight: height - margin.top - margin.bottom };
}

function resetChart() {
  const size = dimensions();
  svg.attr("viewBox", `0 0 ${size.width} ${size.height}`);
  svg.selectAll("*").remove();
  tooltip.style("opacity", 0);
  return { size, group: svg.append("g").attr("transform", `translate(${size.margin.left},${size.margin.top})`) };
}

function buildSteps() {
  d3.select("#steps").selectAll("button")
    .data(pages)
    .join("button")
    .attr("aria-label", (_, index) => `Open section ${index + 1}`)
    .on("click", (_, index) => { state.page = index; render(); });
}

function bindButtons() {
  d3.select("#previous").on("click", () => {
    if (state.page > 0) { state.page -= 1; render(); }
  });
  d3.select("#continue").on("click", () => {
    if (state.page < pages.length - 1) { state.page += 1; render(); }
  });
  window.addEventListener("resize", delay(render, 140));
}

function render() {
  const page = pages[state.page];
  d3.select("#sectionLabel").text(page.label);
  d3.select("#storyTitle").text(page.title);
  d3.select("#storyCopy").text(page.copy);
  d3.select("#controls").html("");
  d3.select("#previous").property("disabled", state.page === 0);
  d3.select("#continue").property("disabled", state.page === pages.length - 1)
    .text(state.page === pages.length - 1 ? "Explore above" : "Continue");
  d3.select("#steps").selectAll("button").classed("active", (_, index) => index === state.page);
  if (state.page === 0) drawRanking();
  if (state.page === 1) drawFactors();
  if (state.page === 2) drawCountryHistory();
}

function drawRanking() {
  const { size, group } = resetChart();
  const top = data.filter(d => d.year === 2019).sort((a, b) => d3.ascending(a.rank, b.rank)).slice(0, 12).reverse();
  const x = d3.scaleLinear().domain([5.5, 8]).range([0, size.innerWidth]);
  const y = d3.scaleBand().domain(top.map(d => d.country)).range([0, size.innerHeight]).padding(.28);

  group.append("g").attr("class", "grid").attr("transform", `translate(0,${size.innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickSize(-size.innerHeight).tickFormat(""));
  group.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0).tickPadding(10));
  group.append("g").attr("class", "axis").attr("transform", `translate(0,${size.innerHeight})`)
    .call(d3.axisBottom(x).ticks(5));
  axisLabels(group, size, "Happiness score", "");

  group.selectAll(".bar").data(top).join("rect")
    .attr("class", "bar")
    .attr("x", x(5.5)).attr("y", d => y(d.country))
    .attr("width", d => x(d.score) - x(5.5)).attr("height", y.bandwidth())
    .attr("rx", 4).attr("fill", d => d.country === "Finland" ? "#d79a2b" : "#327b91");

  group.selectAll(".scoreLabel").data(top).join("text")
    .attr("x", d => x(d.score) + 8).attr("y", d => y(d.country) + y.bandwidth() / 2 + 4)
    .attr("fill", "#60707d").attr("font-size", 11).text(d => d.score.toFixed(2));

  const finland = top.find(d => d.country === "Finland");
  addAnnotation(group, {
    x: x(finland.score), y: y(finland.country) + y.bandwidth() / 2,
    boxX: Math.max(340, size.innerWidth - 265), boxY: 16, width: 250,
    title: "Finland ranked first",
    lines: ["Its score reached 7.77 out of 10.", "Four Nordic countries made the top ten."]
  });
}

function drawFactors() {
  const controlsNode = document.querySelector("#controls");
  controlsNode.replaceChildren();
  const controls = d3.select(controlsNode);
  controls.append("label").attr("class", "controlLabel").attr("for", "factorSelect").text("Choose a condition");
  const select = controls.append("select").attr("id", "factorSelect");
  select.selectAll("option").data(Object.entries(factorNames)).join("option")
    .attr("value", d => d[0]).property("selected", d => d[0] === state.selectedFactor).text(d => d[1]);
  select.on("change", event => { state.selectedFactor = event.target.value; render(); });

  const { size, group } = resetChart();
  const rows = data.filter(d => d.year === 2019 && Number.isFinite(d[state.selectedFactor]));
  const x = d3.scaleLinear().domain(d3.extent(rows, d => d[state.selectedFactor])).nice().range([0, size.innerWidth]);
  const y = d3.scaleLinear().domain([2.5, 8]).range([size.innerHeight, 0]);

  group.append("g").attr("class", "grid").attr("transform", `translate(0,${size.innerHeight})`)
    .call(d3.axisBottom(x).ticks(6).tickSize(-size.innerHeight).tickFormat(""));
  group.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(6).tickSize(-size.innerWidth).tickFormat(""));
  group.append("g").attr("class", "axis").attr("transform", `translate(0,${size.innerHeight})`).call(d3.axisBottom(x).ticks(6));
  group.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6));
  axisLabels(group, size, factorNames[state.selectedFactor], "Happiness score");

  const regression = linearRegression(rows.map(d => [d[state.selectedFactor], d.score]));
  const domain = x.domain();
  group.append("line")
    .attr("x1", x(domain[0])).attr("x2", x(domain[1]))
    .attr("y1", y(regression.intercept + regression.slope * domain[0]))
    .attr("y2", y(regression.intercept + regression.slope * domain[1]))
    .attr("stroke", "#986516").attr("stroke-width", 2).attr("stroke-dasharray", "7 5");

  const points = group.selectAll(".point").data(rows).join("circle")
    .attr("class", "point").attr("cx", d => x(d[state.selectedFactor])).attr("cy", d => y(d.score))
    .attr("r", 4.5).attr("fill", "#327b91").attr("fill-opacity", .68).attr("stroke", "white").attr("stroke-width", .8);
  addTooltip(points, d => `<strong>${d.country}</strong><br>${factorNames[state.selectedFactor]}: ${d[state.selectedFactor].toFixed(3)}<br>Happiness score: ${d.score.toFixed(3)}`);

  const correlation = d3.correlation ? d3.correlation(rows, d => d[state.selectedFactor], d => d.score) : pearson(rows.map(d => d[state.selectedFactor]), rows.map(d => d.score));
  const standout = rows.map(d => ({...d, residual: d.score - (regression.intercept + regression.slope * d[state.selectedFactor])})).sort((a,b) => d3.descending(a.residual,b.residual))[0];
  addAnnotation(group, {
    x: x(standout[state.selectedFactor]), y: y(standout.score),
    boxX: 18, boxY: 18, width: 266,
    title: `${standout.country} exceeds the trend`,
    lines: [`Its happiness score is higher than`, `this condition alone would predict.`]
  });
}

function drawCountryHistory() {
  const controlsNode = document.querySelector("#controls");
  controlsNode.replaceChildren();

  const available = Array.from(d3.group(data, d => d.country), ([country, rows]) => ({country, count: rows.length}))
    .filter(d => d.count === 5).map(d => d.country).sort(d3.ascending);
  if (!available.includes(state.selectedCountry)) state.selectedCountry = available[0];

  const controls = d3.select(controlsNode);
  controls.append("label").attr("class", "controlLabel").attr("for", "countrySelect").text("Choose a country");
  const countrySelect = controls.append("select").attr("id", "countrySelect");
  countrySelect.selectAll("option").data(available).join("option")
    .attr("value", d => d).property("selected", d => d === state.selectedCountry).text(d => d);
  countrySelect.on("change", event => { state.selectedCountry = event.target.value; render(); });

  controls.append("label").attr("class", "controlLabel").attr("for", "metricSelect").text("Choose a condition");
  const metricSelect = controls.append("select").attr("id", "metricSelect");
  metricSelect.selectAll("option").data(Object.entries(factorNames)).join("option")
    .attr("value", d => d[0]).property("selected", d => d[0] === state.selectedFactor).text(d => d[1]);
  metricSelect.on("change", event => { state.selectedFactor = event.target.value; render(); });

  const { size, group } = resetChart();
  const rows = data.filter(d => d.country === state.selectedCountry).sort((a,b) => d3.ascending(a.year,b.year));
  const x = d3.scalePoint().domain(rows.map(d => d.year)).range([0, size.innerWidth]).padding(.35);
  const yScore = d3.scaleLinear().domain([0, 8]).range([size.innerHeight, 0]);
  const factorExtent = d3.extent(rows, d => d[state.selectedFactor]);
  const padding = Math.max((factorExtent[1] - factorExtent[0]) * .3, .08);
  const yFactor = d3.scaleLinear().domain([Math.max(0, factorExtent[0] - padding), factorExtent[1] + padding]).nice().range([size.innerHeight, 0]);

  group.append("g").attr("class", "grid").call(d3.axisLeft(yScore).ticks(6).tickSize(-size.innerWidth).tickFormat(""));
  group.append("g").attr("class", "axis").attr("transform", `translate(0,${size.innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  group.append("g").attr("class", "axis").call(d3.axisLeft(yScore).ticks(6));
  group.append("g").attr("class", "axis").attr("transform", `translate(${size.innerWidth},0)`).call(d3.axisRight(yFactor).ticks(6));
  axisLabels(group, size, "Year", "Happiness score");
  group.append("text").attr("class", "axisLabel").attr("transform", "rotate(90)")
    .attr("x", size.innerHeight / 2).attr("y", -size.innerWidth - 48).attr("text-anchor", "middle").text(factorNames[state.selectedFactor]);

  const scoreLine = d3.line().x(d => x(d.year)).y(d => yScore(d.score));
  const factorLine = d3.line().x(d => x(d.year)).y(d => yFactor(d[state.selectedFactor]));
  group.append("path").datum(rows).attr("fill", "none").attr("stroke", "#d79a2b").attr("stroke-width", 3).attr("d", scoreLine);
  group.append("path").datum(rows).attr("fill", "none").attr("stroke", "#327b91").attr("stroke-width", 3).attr("d", factorLine);

  const scorePoints = group.selectAll(".scorePoint").data(rows).join("circle")
    .attr("class", "point scorePoint").attr("cx", d => x(d.year)).attr("cy", d => yScore(d.score)).attr("r", 5).attr("fill", "#d79a2b").attr("stroke", "white").attr("stroke-width", 1.2);
  const factorPoints = group.selectAll(".factorPoint").data(rows).join("circle")
    .attr("class", "point factorPoint").attr("cx", d => x(d.year)).attr("cy", d => yFactor(d[state.selectedFactor])).attr("r", 5).attr("fill", "#327b91").attr("stroke", "white").attr("stroke-width", 1.2);
  addTooltip(scorePoints, d => `<strong>${state.selectedCountry}, ${d.year}</strong><br>Happiness score: ${d.score.toFixed(3)}`);
  addTooltip(factorPoints, d => `<strong>${state.selectedCountry}, ${d.year}</strong><br>${factorNames[state.selectedFactor]}: ${d[state.selectedFactor].toFixed(3)}`);

  legend(group, [{label: "Happiness score", color: "#d79a2b"}, {label: factorNames[state.selectedFactor], color: "#327b91"}], 10, 8);
  const start = rows[0], end = rows[rows.length - 1];
  const change = end.score - start.score;
  addAnnotation(group, {
    x: x(end.year), y: yScore(end.score), boxX: Math.max(18, size.innerWidth - 290), boxY: 18, width: 275,
    title: `${state.selectedCountry} changed ${d3.format("+.2f")(change)} points`,
    lines: ["The line shows the movement in its", "reported happiness score since 2015."]
  });
}

function addTooltip(selection, content) {
  selection.on("mouseenter", function(event, d) {
    d3.select(this).attr("r", 7);
    const bounds = chartArea.getBoundingClientRect();
    tooltip.style("opacity", 1).html(content(d))
      .style("left", `${event.clientX - bounds.left}px`).style("top", `${event.clientY - bounds.top}px`);
  }).on("mousemove", function(event) {
    const bounds = chartArea.getBoundingClientRect();
    tooltip.style("left", `${event.clientX - bounds.left}px`).style("top", `${event.clientY - bounds.top}px`);
  }).on("mouseleave", function() {
    d3.select(this).attr("r", 4.5);
    tooltip.style("opacity", 0);
  });
}

function addAnnotation(group, item) {
  const annotation = group.append("g");
  const endX = item.boxX < item.x ? item.boxX + item.width : item.boxX;
  const endY = item.boxY + 34;
  annotation.append("path").attr("class", "annotationLine")
    .attr("d", `M${item.x},${item.y} C${item.x},${(item.y + endY) / 2} ${endX},${(item.y + endY) / 2} ${endX},${endY}`);
  annotation.append("circle").attr("class", "annotationDot").attr("cx", item.x).attr("cy", item.y).attr("r", 5);
  annotation.append("rect").attr("class", "annotationBox").attr("x", item.boxX).attr("y", item.boxY)
    .attr("width", item.width).attr("height", 43 + item.lines.length * 16).attr("rx", 8);
  annotation.append("text").attr("class", "annotationTitle").attr("x", item.boxX + 12).attr("y", item.boxY + 21).text(item.title);
  item.lines.forEach((line, index) => annotation.append("text").attr("class", "annotationCopy")
    .attr("x", item.boxX + 12).attr("y", item.boxY + 42 + index * 16).text(line));
}

function legend(group, items, x, y) {
  const key = group.append("g").attr("transform", `translate(${x},${y})`);
  items.forEach((item, index) => {
    key.append("line").attr("x1", 0).attr("x2", 22).attr("y1", index * 22 + 5).attr("y2", index * 22 + 5)
      .attr("stroke", item.color).attr("stroke-width", 3);
    key.append("text").attr("x", 29).attr("y", index * 22 + 9).attr("fill", "#60707d").attr("font-size", 12).text(item.label);
  });
}

function axisLabels(group, size, xLabel, yLabel) {
  if (xLabel) group.append("text").attr("class", "axisLabel").attr("x", size.innerWidth / 2).attr("y", size.innerHeight + 62).attr("text-anchor", "middle").text(xLabel);
  if (yLabel) group.append("text").attr("class", "axisLabel").attr("transform", "rotate(-90)").attr("x", -size.innerHeight / 2).attr("y", -64).attr("text-anchor", "middle").text(yLabel);
}

function linearRegression(points) {
  const meanX = d3.mean(points, d => d[0]);
  const meanY = d3.mean(points, d => d[1]);
  const numerator = d3.sum(points, d => (d[0] - meanX) * (d[1] - meanY));
  const denominator = d3.sum(points, d => Math.pow(d[0] - meanX, 2));
  const slope = numerator / denominator;
  return { slope, intercept: meanY - slope * meanX };
}

function pearson(xs, ys) {
  const mx = d3.mean(xs), my = d3.mean(ys);
  const top = d3.sum(xs, (x, i) => (x - mx) * (ys[i] - my));
  const bottom = Math.sqrt(d3.sum(xs, x => Math.pow(x - mx, 2)) * d3.sum(ys, y => Math.pow(y - my, 2)));
  return top / bottom;
}

function delay(fn, wait) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}