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

function plot(data, selectedYear = 2017) {
  d3.select(element).selectAll("*").remove();
  
  const parsedData = Array.isArray(data) ? data : parseCSVData(data);
  
  // Set the element to fill its parent container efficiently
  d3.select(element)
    .style("width", "100%")
    .style("height", "100%")
    .style("min-height", "500px")
    .style("display", "flex")
    .style("flex-direction", "column");
    
  const container = d3.select(element)
    .append("div")
    .attr("class", "comparison-container")
    .style("width", "100%")
    .style("height", "100%")
    .style("display", "flex")
    .style("flex-direction", "column")
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
      updateChart();
    });

  const yearLabel = controls.append("span")
    .style("color", "white")
    .style("margin-left", "10px")
    .style("font-size", "12px")
    .text(`Year: ${selectedYear}`);

  const chartArea = container.append("div")
    .style("width", "100%")
    .style("flex", "1")
    .style("background", "rgba(255,255,255,0.1)")
    .style("border-radius", "8px")
    .style("padding", "10px")
    .style("display", "flex")
    .style("flex-direction", "column");

  const margin = {top: 20, right: 30, bottom: 60, left: 80};
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
    const currentYear = globalSelectedYear || selectedYear;
    yearLabel.text(`Year: ${currentYear}`);
    
    const yearData = parsedData.filter(d => d.Year === currentYear);
    
    let countriesToShow = globalSelectedCountries.length > 0 ? 
      yearData.filter(d => globalSelectedCountries.includes(d.Entity)) : 
      yearData.slice(0, 10);

    if (countriesToShow.length === 0) return;

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
        updateChart();
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
}