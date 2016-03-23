var root, duration = 500,
    maxLabelLength = 20;
var format = d3.time.format("%a, %b %e %I:%M%p %Y");

var areas = {
	'0': 'Match Everything Area',
	'1': 'Manhattan',
	'2352': 'NYC Metro Area',
	'9851': 'Tri-State  Commission',
	'12736': 'Distance Based Pricing Area'
};

var charges = ["BASE_CHARGE", "ROUNDTRIP_CHARGE", "ACCOUNT_CHARGE", "PROMOCODE_DISCOUNT", "GROUP_DISCOUNT", "WEB_DISCOUNT", "STOPS_CHARGE", "WAITINGTIME_CHARGE", "PICKUP_CHARGE", "SERVICE_CHARGE", "TOLLS_CHARGE", "PARKING_CHARGE", "BABYSEATS_CHARGE", "MISCELLANEOUS_CHARGE", "VOUCHER_CHARGE"];
var levels = ["ACCOUNT", "PARTNER", "DEFAULT"];
var rules = ["pickup_position", "allowed_for_pickup_date_time", "dropoff_position", "valid_for_accounts", "valid_for_partners", "valid_for_asap_jobs", "valid_for_canceled_reservation", "valid_for_ride_from", "valid_for_ride_until"]

function orderCharges(a, b) {
	return charges.indexOf(a) - charges.indexOf(b);
}
function orderLevels(a, b) {
	return levels.indexOf(a) - levels.indexOf(b);
}
function orderALLlast(a, b) {
	if (a.startsWith('ALL_')) a = '~';
	if (b.startsWith('ALL_')) b = '~';
	return d3.ascending(a, b);
}
function orderRuleNames(a, b) {
    return rules.indexOf(a.name) - rules.indexOf(b.name);
}

function info(d) {
	if (d.formula) return d.od + ' ' + d.formula;
	if (d.name && d.value) {
		if (d.name == 'valid_for_ride_from' || d.name == 'valid_for_ride_until') {
			return d.name + ': ' + format(new Date(1 * d.value));
		} else if (d.name == 'pickup_position' || d.name == 'dropoff_position') {
            var areaName = areas[d.value];
            return (areaName == undefined) ? d.name + ': ' + d.value : d.name + ': ' + areaName;
		} else {
			return d.name + ': ' + d.value;
		}
	} else {
		return d.name;
	}
}

d3.json("data/definitions.big.json", function(error, treeData) {
//	http://bl.ocks.org/robschmuecker/7926762
	var nest = {
		key: 'COMMISSIONS',
		values: d3.nest()
			.key(function(d) {return d.entity_type;})
			.sortKeys(d3.ascending)
			.key(function(d) {return d.charge;})
			.sortKeys(orderCharges)
			.key(function(d) {return d.entity_id;})
			.sortKeys(orderALLlast)
			.key(function(d) {return d.car_class;})
			.sortKeys(orderALLlast)
			.key(function(d) {return d.configuration_level;})
			.sortKeys(orderLevels)
			.sortValues(function(a, b) {
				return b.sequence_number - a.sequence_number;
			})
			.entries(treeData.map(function(rec) {
                rec.rules.sort(orderRuleNames);
                return rec;
            }))
	};

	var tmp = JSON.stringify(nest);
	tmp = tmp.replace(/"id":/gi, '"od":');
	tmp = tmp.replace(/"key":/gi, '"name":');
	tmp = tmp.replace(/"values":/gi, '"children":');
	tmp = tmp.replace(/"rules":/gi, '"children":');

	root = JSON.parse(tmp);

    // Calculate total nodes, max label length
    var i = 0,
        totalNodes = 0;

    // size of the diagram
    var viewerWidth = $(document).width();
    var viewerHeight = $(document).height();

    var tree = d3.layout.tree()
        .size([viewerHeight, viewerWidth]);

    // define a d3 diagonal projection for use by the node paths later on.
    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });

    // A recursive helper function for performing some setup by walking through all nodes
    function visit(parent, visitFn, childrenFn) {
        if (!parent) return;

        visitFn(parent);

        var children = childrenFn(parent);
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                visit(children[i], visitFn, childrenFn);
            }
        }
    }

    // Call visit function to establish maxLabelLength
    visit(treeData, function(d) {
        totalNodes++;
    }, function(d) {
        return d.children && d.children.length > 0 ? d.children : null;
    });

    // Define the zoom function for the zoomable tree
    function zoom() {
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#tree-container").append("svg")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        .call(zoomListener);

    // Helper functions for collapsing and expanding nodes.
    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }
	
    function expand(d) {
        if (d._children) {
            d.children = d._children;
            d.children.forEach(expand);
            d._children = null;
        }
    }

    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.
    function centerNode(source) {
        scale = zoomListener.scale();
        x = -source.y0;
        y = -source.x0;
        x = x * scale + viewerWidth / 2;
        y = y * scale + viewerHeight / 2;
        d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
    }

    // Toggle children function
    function toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }
	
    // Toggle children on click.
    function click(d) {
        if (d3.event && d3.event.defaultPrevented) return; // click suppressed
        d = toggleChildren(d);
        update(d);
        centerNode(d);
    }

    $('#search').on('keydown', function(e) {
        if (e.keyCode == 13) {
			var id = 1 * $(this).val();
			var found = treeData.filter(function(rec) {return rec.id === id;});
			if (found.length == 1) search(found[0]);
		}
    });

    function search(obj) {
		var keys, index, next;
		if (!root.children) click(root);

		next = root.children;
        next.forEach(collapse);
		['entity_type', 'charge', 'entity_id', 'car_class', 'configuration_level'].forEach(function(property, step) {
			keys = next.map(function(item) {return item.name;});
			index = keys.indexOf(obj[property]);
			click(next[index]);
			next = next[index].children;
            next.forEach(collapse);
		});
		keys = next.map(function(item) {return item.od;});
		index = keys.indexOf(obj.id);
		click(next[index]);
    }

    function update(source) {
        // Compute the new height, function counts total children of root node and sets tree height accordingly.
        // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
        // This makes the layout more consistent.
        var levelWidth = [1];
        var childCount = function(level, n) {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, root);
        var newHeight = d3.max(levelWidth) * 32;
        tree = tree.size([newHeight, viewerWidth]);

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Set widths between levels based on maxLabelLength.
        nodes.forEach(function(d) {
            d.y = d.depth * maxLabelLength * 12;
        });

        // Update the nodes…
        node = svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', click);

        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0)
            .style("fill", function(d) {
                return d._children ? "orange" : "white";
            });

        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(info)
            .style("fill-opacity", 0);

        // Update the text to reflect whether node has children or not.
        node.select('text')
            .attr("x", function(d) {
                return d.children || d._children ? -12 : 12;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(info);

        // Change the circle fill depending on whether it has children and is collapsed
        node.select("circle.nodeCircle")
            .attr("r", 8)
            .style("fill", function(d) {
                return d._children ? "orange" : "white";
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Fade the text in
        nodeUpdate.select("text")
            .style("fill-opacity", 1)
            .style("fill", function(d) {
                return d.formula ? "#096b9c" : "black"
            });

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

//        nodeExit.select("circle")
//            .attr("r", 0);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        // Update the links…
        var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    var svgGroup = baseSvg.append("g");

    // Define the root
    root.x0 = viewerHeight / 2;
    root.y0 = 0;

	// Collapse all children of roots children before rendering.
	root.children.forEach(collapse);

    // Layout the tree initially and center on the root node.
    update(root);
    centerNode(root);
});
