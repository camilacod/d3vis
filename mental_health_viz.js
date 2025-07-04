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

// Timeline Chart
function plotTimeline(data, selectedCountries = ['Afghanistan', 'Albania', 'Algeria']) {
  d3.select(element).selectAll("*").remove();
  
  const parsedData = Array.isArray(data) ? data : parseCSVData(data);
  allData = parsedData;
  
  const container = d3.select(element)
    .append("div")
    .attr("class", "timeline-container")
    .style("width", "100%")
    .style("height", "100%")
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
        updateAllVisualizationsFromSelection();
      }
    });

  const countries = [...new Set(parsedData.map(d => d.Entity))].sort();
  countrySelect.append("option").attr("value", "").text("Add Country...");
  countries.forEach(country => {
    countrySelect.append("option").attr("value", country).text(country);
  });

  const chartArea = container.append("div")
    .style("width", "100%")
    .style("height", "calc(100% - 80px)")
    .style("background", "rgba(255,255,255,0.1)")
    .style("border-radius", "8px")
    .style("padding", "10px");

  const margin = {top: 20, right: 30, bottom: 40, left: 60};
  const width = chartArea.node().clientWidth - margin.left - margin.right;
  const height = chartArea.node().clientHeight - margin.top - margin.bottom;

  const svg = chartArea.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  function updateChart() {
    g.selectAll("*").remove();
    
    const countriesToShow = globalSelectedCountries.length > 0 ? globalSelectedCountries : selectedCountries;
    const filteredData = parsedData.filter(d => countriesToShow.includes(d.Entity));
    
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
          updateAllVisualizationsFromSelection();
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
          updateAllVisualizationsFromYear();
        });
    });
  }

  updateChart();
  
  window.updateTimelineChart = updateChart;
}

// Comparison Bar Chart
function plotComparison(data, selectedYear = 2017) {
  d3.select(element).selectAll("*").remove();
  
  const parsedData = Array.isArray(data) ? data : parseCSVData(data);
  
  const container = d3.select(element)
    .append("div")
    .attr("class", "comparison-container")
    .style("width", "100%")
    .style("height", "100%")
    .style("background", "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)")
    .style("border-radius", "12px")
    .style("padding", "15px")
    .style("box-sizing", "border-box");

  const header = container.append("div")
    .style("color", "white")
    .style("font-weight", "600")
    .style("font-size", "14px")
    .style("margin-bottom", "10px")
    .text(`Mental Health Comparison (${selectedYear})`);

  const controls = container.append("div")
    .style("margin-bottom", "15px");

  const yearSlider = controls.append("input")
    .attr("type", "range")
    .attr("min", d3.min(parsedData, d => d.Year))
    .attr("max", d3.max(parsedData, d => d.Year))
    .attr("value", selectedYear)
    .style("width", "200px")
    .style("accent-color", "#38ef7d")
    .on("input", function() {
      globalSelectedYear = +this.value;
      setSelectedSingleValue(globalSelectedYear);
      updateAllVisualizationsFromYear();
    });

  const yearLabel = controls.append("span")
    .style("color", "white")
    .style("margin-left", "10px")
    .style("font-size", "12px")
    .text(`Year: ${selectedYear}`);

  const chartArea = container.append("div")
    .style("width", "100%")
    .style("height", "calc(100% - 80px)")
    .style("background", "rgba(255,255,255,0.1)")
    .style("border-radius", "8px")
    .style("padding", "10px")
    .style("overflow-y", "auto");

  const margin = {top: 20, right: 30, bottom: 60, left: 80};
  const width = chartArea.node().clientWidth - margin.left - margin.right;
  const height = Math.max(300, chartArea.node().clientHeight - margin.top - margin.bottom);

  const svg = chartArea.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  function updateChart() {
    g.selectAll("*").remove();
    yearLabel.text(`Year: ${globalSelectedYear || selectedYear}`);
    
    const currentYear = globalSelectedYear || selectedYear;
    const yearData = parsedData.filter(d => d.Year === currentYear);
    
    const countriesToShow = globalSelectedCountries.length > 0 ? 
      yearData.filter(d => globalSelectedCountries.includes(d.Entity)) : 
      yearData.slice(0, 10);

    const disorders = ['Depression (%)', 'Anxiety disorders (%)', 'Bipolar disorder (%)', 'Schizophrenia (%)'];
    
    const xScale = d3.scaleBand()
      .domain(countriesToShow.map(d => d.Entity))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(countriesToShow, d => d3.max(disorders, disorder => d[disorder]))])
      .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
      .domain(disorders)
      .range(['#e74c3c', '#f39c12', '#9b59b6', '#3498db']);

    const stackedData = d3.stack()
      .keys(disorders)
      (countriesToShow);

    g.selectAll(".layer")
      .data(stackedData)
      .enter().append("g")
      .attr("class", "layer")
      .attr("fill", d => colorScale(d.key))
      .selectAll("rect")
      .data(d => d)
      .enter().append("rect")
      .attr("x", d => xScale(d.data.Entity))
      .attr("y", d => yScale(d[1]))
      .attr("height", d => yScale(d[0]) - yScale(d[1]))
      .attr("width", xScale.bandwidth())
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        globalSelectedCountries = [d.data.Entity];
        setSelectedValues([d.data.Entity]);
        updateAllVisualizationsFromSelection();
      });

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("fill", "white")
      .style("font-size", "10px")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("fill", "white")
      .style("font-size", "10px");
  }

  updateChart();
  
  window.updateComparisonChart = updateChart;
}

// Scatter Plot
function plotScatter(data, selectedCountries = []) {
  d3.select(element).selectAll("*").remove();
  
  const parsedData = Array.isArray(data) ? data : parseCSVData(data);
  
  const container = d3.select(element)
    .append("div")
    .attr("class", "scatter-container")
    .style("width", "100%")
    .style("height", "100%")
    .style("background", "linear-gradient(135deg, #667eea 0%, #764ba2 100%)")
    .style("border-radius", "12px")
    .style("padding", "15px")
    .style("box-sizing", "border-box");

  const header = container.append("div")
    .style("color", "white")
    .style("font-weight", "600")
    .style("font-size", "14px")
    .style("margin-bottom", "10px")
    .text("Depression vs Anxiety Correlation");

  const controls = container.append("div")
    .style("display", "flex")
    .style("gap", "10px")
    .style("margin-bottom", "15px");

  const yearFilter = controls.append("select")
    .style("background", "rgba(255,255,255,0.2)")
    .style("border", "1px solid rgba(255,255,255,0.3)")
    .style("border-radius", "6px")
    .style("color", "white")
    .style("padding", "5px")
    .style("font-size", "12px")
    .on("change", function() {
      globalSelectedYear = +this.value || null;
      setSelectedSingleValue(globalSelectedYear);
      updateAllVisualizationsFromYear();
    });

  const years = [...new Set(parsedData.map(d => d.Year))].sort();
  yearFilter.append("option").attr("value", "").text("All Years");
  years.forEach(year => {
    yearFilter.append("option").attr("value", year).text(year);
  });

  const chartArea = container.append("div")
    .style("width", "100%")
    .style("height", "calc(100% - 80px)")
    .style("background", "rgba(255,255,255,0.1)")
    .style("border-radius", "8px")
    .style("padding", "10px");

  const margin = {top: 20, right: 30, bottom: 40, left: 60};
  const width = chartArea.node().clientWidth - margin.left - margin.right;
  const height = chartArea.node().clientHeight - margin.top - margin.bottom;

  const svg = chartArea.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  function updateChart() {
    g.selectAll("*").remove();
    
    let filteredData = parsedData;
    
    if (globalSelectedYear) {
      filteredData = filteredData.filter(d => d.Year === globalSelectedYear);
    }
    
    if (globalSelectedCountries.length > 0) {
      filteredData = filteredData.filter(d => globalSelectedCountries.includes(d.Entity));
    }

    const xScale = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d['Depression (%)']))
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d['Anxiety disorders (%)']))
      .range([height, 0]);

    const colorScale = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.Year))
      .range(['#ff6b6b', '#4ecdc4']);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("fill", "white")
      .style("font-size", "10px");

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("fill", "white")
      .style("font-size", "10px");

    g.selectAll(".dot")
      .data(filteredData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d['Depression (%)']))
      .attr("cy", d => yScale(d['Anxiety disorders (%)']))
      .attr("r", 4)
      .attr("fill", d => colorScale(d.Year))
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .style("opacity", 0.7)
      .on("click", function(event, d) {
        globalSelectedCountries = [d.Entity];
        globalSelectedYear = d.Year;
        setSelectedValues([d.Entity]);
        setSelectedSingleValue(d.Year);
        updateAllVisualizationsFromSelection();
      });
  }

  updateChart();
  
  window.updateScatterChart = updateChart;
}

// Linked view update functions
function updateAllVisualizationsFromSelection() {
  if (window.updateTimelineChart) window.updateTimelineChart();
  if (window.updateComparisonChart) window.updateComparisonChart();
  if (window.updateScatterChart) window.updateScatterChart();
}

function updateAllVisualizationsFromYear() {
  if (window.updateComparisonChart) window.updateComparisonChart();
  if (window.updateScatterChart) window.updateScatterChart();
}