// Global variables for linked views
let globalSelectedCountries = [];
let globalSelectedYear = null;
let allData = [];

function setSelectedValues(values) {
  model.set({ selectedValues: values });
  model.save_changes();
}

function setSelectedSingleValue(value) {
  model.set({ selectedSingleValue: value });
  model.save_changes();
}

function parseCSVData(csvData) {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, index) => {
      const cleanHeader = header.trim();
      const value = values[index] ? values[index].trim() : '';
      
      if (cleanHeader === 'Year' || cleanHeader === 'index') {
        row[cleanHeader] = parseInt(value);
      } else if (cleanHeader.includes('(%)')) {
        row[cleanHeader] = parseFloat(value);
      } else {
        row[cleanHeader] = value;
      }
    });
    return row;
  });
}

function plot(data, selectedCountries = ['Afghanistan', 'Albania', 'Algeria']) {
  d3.select(element).selectAll("*").remove();
  
  const parsedData = Array.isArray(data) ? data : parseCSVData(data);
  allData = parsedData;
  
  // Set the element to fill its parent container efficiently
  d3.select(element)
    .style("width", "100%")
    .style("height", "100%")
    .style("min-height", "500px")
    .style("display", "flex")
    .style("flex-direction", "column");
    
  const container = d3.select(element)
    .append("div")
    .attr("class", "timeline-container")
    .style("width", "100%")
    .style("height", "100%")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("background", "linear-gradient(135deg, #667eea 0%, #764ba2 100%)")
    .style("border-radius", "12px")
    .style("padding", "15px")
    .style("box-sizing", "border-box");

  const header = container.append("div")
    .style("color", "white")
    .style("font-weight", "600")
    .style("font-size", "14px")
    .style("margin-bottom", "10px")
    .text("Depression Trends Over Time");

  const controls = container.append("div")
    .style("display", "flex")
    .style("gap", "10px")
    .style("margin-bottom", "15px");

  const countrySelect = controls.append("select")
    .attr("class", "country-selector")
    .style("background", "rgba(255,255,255,0.2)")
    .style("border", "1px solid rgba(255,255,255,0.3)")
    .style("border-radius", "6px")
    .style("color", "white")
    .style("padding", "5px")
    .style("font-size", "12px")
    .on("change", function() {
      const selectedCountry = this.value;
      if (selectedCountry && !globalSelectedCountries.includes(selectedCountry)) {
        globalSelectedCountries.push(selectedCountry);
        setSelectedValues(globalSelectedCountries);
        updateChart();
      }
    });

  const countries = [...new Set(parsedData.map(d => d.Entity))].sort();
  countrySelect.append("option").attr("value", "").text("Add Country...");
  countries.forEach(country => {
    countrySelect.append("option").attr("value", country).text(country);
  });

  const chartArea = container.append("div")
    .style("width", "100%")
    .style("flex", "1")
    .style("background", "rgba(255,255,255,0.1)")
    .style("border-radius", "8px")
    .style("padding", "10px")
    .style("display", "flex")
    .style("flex-direction", "column");

  const margin = {top: 20, right: 30, bottom: 40, left: 60};
  const width = chartArea.node().clientWidth - margin.left - margin.right;
  const height = chartArea.node().clientHeight - margin.top - margin.bottom - 20;

  const svg = chartArea.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("flex", "1")
    .style("min-height", "400px");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  function updateChart() {
    g.selectAll("*").remove();
    
    const countriesToShow = globalSelectedCountries.length > 0 ? globalSelectedCountries : selectedCountries;
    const filteredData = parsedData.filter(d => countriesToShow.includes(d.Entity));
    
    if (filteredData.length === 0) return;
    
    const xScale = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.Year))
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d['Depression (%)']))
      .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
      .domain(countriesToShow)
      .range(['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fd79a8']);

    const line = d3.line()
      .x(d => xScale(d.Year))
      .y(d => yScale(d['Depression (%)']))
      .curve(d3.curveMonotoneX);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text")
      .style("fill", "white")
      .style("font-size", "10px");

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("fill", "white")
      .style("font-size", "10px");

    countriesToShow.forEach(country => {
      const countryData = filteredData.filter(d => d.Entity === country);
      
      if (countryData.length === 0) return;
      
      g.append("path")
        .datum(countryData)
        .attr("class", `line-${country.replace(/\s+/g, '-')}`)
        .attr("fill", "none")
        .attr("stroke", colorScale(country))
        .attr("stroke-width", 2)
        .attr("d", line)
        .style("cursor", "pointer")
        .on("click", function() {
          globalSelectedCountries = [country];
          setSelectedValues([country]);
          updateChart();
        });

      g.selectAll(`.dot-${country.replace(/\s+/g, '-')}`)
        .data(countryData)
        .enter().append("circle")
        .attr("class", `dot-${country.replace(/\s+/g, '-')}`)
        .attr("cx", d => xScale(d.Year))
        .attr("cy", d => yScale(d['Depression (%)']))
        .attr("r", 3)
        .attr("fill", colorScale(country))
        .style("cursor", "pointer")
        .on("click", function(event, d) {
          globalSelectedYear = d.Year;
          setSelectedSingleValue(d.Year);
        });
    });
  }

  updateChart();
}