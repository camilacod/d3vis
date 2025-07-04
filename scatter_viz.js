// Global variables for linked views
let globalSelectedCountries = [];
let globalSelectedYear = null;

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

function plot(data, selectedCountries = []) {
  d3.select(element).selectAll("*").remove();
  
  const parsedData = Array.isArray(data) ? data : parseCSVData(data);
  
  // Set the element to fill its parent container efficiently
  d3.select(element)
    .style("width", "100%")
    .style("height", "100%")
    .style("display", "flex")
    .style("flex-direction", "column");

  const container = d3.select(element)
    .append("div")
    .attr("class", "scatter-container")
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
      updateChart();
    });

  const years = [...new Set(parsedData.map(d => d.Year))].sort();
  yearFilter.append("option").attr("value", "").text("All Years");
  years.forEach(year => {
    yearFilter.append("option").attr("value", year).text(year);
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
    .style("flex", "1");

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

    if (filteredData.length === 0) return;

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
        updateChart();
      });
  }

  updateChart();
}