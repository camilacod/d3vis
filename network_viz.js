function setSelectedValues(values) {
  model.set({ selectedValues: values });
  model.save_changes();
}

function plot(data, nodeTypeField) {
  d3.select(element).selectAll("*").remove();
  
  nodeTypeField = nodeTypeField || 'type';

  let nodes = [];
  let links = [];
  
  if (Array.isArray(data) && data.length === 2 && 
      Array.isArray(data[0]) && Array.isArray(data[1])) {
    nodes = data[0];
    links = data[1];
  } else if (data.nodes && data.edges) {
    nodes = data.nodes;
    links = data.edges;
  } else if (Array.isArray(data)) {
    nodes = data.filter(d => d.hasOwnProperty('id') && d.hasOwnProperty(nodeTypeField));
    links = data.filter(d => d.hasOwnProperty('source') && d.hasOwnProperty('target'));
  }
  
  const container = d3.select(element)
    .append("div")
    .attr("class", "network-container")
    .style("position", "relative")
    .style("width", "100%")
    .style("height", "100%")
    .style("max-height", "300px");

  const header = container.append("div")
    .attr("class", "header")
    .style("margin-bottom", "5px");

  header.append("h3")
    .style("margin", "0 0 5px 0")
    .style("font-size", "14px")
    .text("Network Visualization");

  const legend = header.append("div")
    .attr("class", "legend")
    .style("display", "flex")
    .style("gap", "10px")
    .style("margin-bottom", "5px");

  const nodeTypes = [...new Set(nodes.map(d => d[nodeTypeField]))];
  
  const colorScale = d3.scaleOrdinal()
    .domain(nodeTypes)
    .range(d3.schemeCategory10);
    
  nodeTypes.forEach(type => {
    const legendItem = legend.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "5px");
      
    legendItem.append("div")
      .style("width", "12px")
      .style("height", "12px")
      .style("background-color", colorScale(type))
      .style("border-radius", "50%");
      
    legendItem.append("span")
      .text(type);
  });
  
  const controls = header.append("div")
    .attr("class", "controls")
    .style("display", "flex")
    .style("gap", "10px")
    .style("margin-bottom", "5px");
    
  const resetButton = controls.append("button")
    .text("Reset View")
    .style("cursor", "pointer");

  const vizContainer = container.append("div")
    .attr("class", "visualization-container")
    .style("width", "100%")
    .style("height", "calc(100% - 50px)")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("position", "relative");

  const tooltip = vizContainer.append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("padding", "5px")
    .style("box-shadow", "0 0 10px rgba(0,0,0,0.1)")
    .style("pointer-events", "none")
    .style("z-index", "10");

  const width = vizContainer.node().clientWidth;
  const height = vizContainer.node().clientHeight;
  
  const svg = vizContainer.append("svg")
    .attr("width", width)
    .attr("height", height);
  
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    
  svg.call(zoom);
  
  const g = svg.append("g");
  
  function getNodeSize(d) {
    if (d[nodeTypeField] === 'person') {
      return 8;
    } else {
      // Size based on connections
      const connCount = links.filter(link => 
        link.source === d.id || link.source.id === d.id || 
        link.target === d.id || link.target.id === d.id
      ).length;
      return Math.max(12, Math.min(25, 12 + connCount / 2));
    }
  }
  
  function getShortName(name) {
    if (!name) return '';
    if (typeof name !== 'string') return name;
    
    if (name.startsWith('Centro de ')) {
      return name.substring(10).trim();
    }
    if (name.startsWith('Departamento de ')) {
      return name.substring(16).trim();
    }
    if (name.startsWith('Grupo de ')) {
      return name.substring(9).trim();
    }
    
    const words = name.split(' ');
    if (words.length <= 2) return name;
    
    if (name.includes('Departamento')) {
      return name.split(' ')
        .filter(w => w.length > 0 && w[0].toUpperCase() === w[0])
        .map(w => w[0])
        .join('');
    }
    
    return words.slice(0, 2).join(' ');
  }
  
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => getNodeSize(d) + 5));
  
  const linkElements = g.append("g")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1);
  
  const nodeGroup = g.append("g")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node-group")
    .call(d3.drag()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded))
    .on("mouseover", showTooltip)
    .on("mouseout", hideTooltip)
    .on("click", highlightConnections);
  
  nodeGroup.append("circle")
    .attr("r", getNodeSize)
    .attr("fill", d => colorScale(d[nodeTypeField]))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5);
  
  nodeGroup.filter(d => d[nodeTypeField] !== 'person')
    .append("text")
    .attr("dy", 4)
    .attr("text-anchor", "middle")
    .text(d => getShortName(d.name))
    .attr("font-size", "8px")
    .attr("fill", "#fff");
  
  function showTooltip(event, d) {
    const connections = links.filter(link => 
      link.source === d.id || link.source.id === d.id || 
      link.target === d.id || link.target.id === d.id
    ).length;
    
    let content = `<strong>${d.name || d.id}</strong><br>`;
    content += `Type: ${d[nodeTypeField]}<br>`;
    content += `Connections: ${connections}`;
    
    if (d.email) content += `<br>Email: ${d.email}`;
    
    tooltip
      .style("visibility", "visible")
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px")
      .html(content);
  }
  
  function hideTooltip() {
    tooltip.style("visibility", "hidden");
  }
  
  function highlightConnections(event, d) {
    linkElements.attr("stroke", "#999").attr("stroke-width", 1).attr("stroke-opacity", 0.6);
    nodeGroup.select("circle").attr("stroke", "#fff").attr("stroke-width", 1.5);
    
    const connectedLinks = links.filter(link => 
      link.source === d.id || link.source.id === d.id || 
      link.target === d.id || link.target.id === d.id
    );
    
    const connectedNodeIds = new Set();
    connectedLinks.forEach(link => {
      connectedNodeIds.add(typeof link.source === 'object' ? link.source.id : link.source);
      connectedNodeIds.add(typeof link.target === 'object' ? link.target.id : link.target);
    });
    
    linkElements
      .filter(link => connectedLinks.includes(link))
      .attr("stroke", "#ff9800")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 1);
    
    nodeGroup
      .filter(node => connectedNodeIds.has(node.id))
      .select("circle")
      .attr("stroke", "#ff9800")
      .attr("stroke-width", 2);
    
    setSelectedValues(nodes.filter(node => connectedNodeIds.has(node.id)));
  }
  
  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  resetButton.on("click", () => {
    linkElements.attr("stroke", "#999").attr("stroke-width", 1).attr("stroke-opacity", 0.6);
    nodeGroup.select("circle").attr("stroke", "#fff").attr("stroke-width", 1.5);
    
    simulation.alpha(1).restart();
    
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
    );
  });
  
  simulation.on("tick", () => {
    linkElements
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
    
    nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
  });
}
