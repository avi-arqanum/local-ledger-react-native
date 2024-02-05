import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Svg, Circle, Line, Text, Path } from "react-native-svg";
import * as d3 from "d3";

const getArrowheadPath = (link) => {
	const deltaX = link.target.x - link.source.x;
	const deltaY = link.target.y - link.source.y;
	const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
	const normX = deltaX / dist;
	const normY = deltaY / dist;
	const sourcePadding = 25;
	const targetPadding = 30;
	const sourceX = link.source.x + sourcePadding * normX;
	const sourceY = link.source.y + sourcePadding * normY;
	const targetX = link.target.x - targetPadding * normX;
	const targetY = link.target.y - targetPadding * normY;

	const arrowPointX = targetX - normX * 10;
	const arrowPointY = targetY - normY * 10;
	const arrowLeftX = arrowPointX - normY * 5;
	const arrowLeftY = arrowPointY + normX * 5;
	const arrowRightX = arrowPointX + normY * 5;
	const arrowRightY = arrowPointY - normX * 5;

	return `M${targetX},${targetY} L${arrowLeftX},${arrowLeftY} L${arrowRightX},${arrowRightY} Z`;
};

const GraphComponent = () => {
	const [nodes, setNodes] = useState([
		{ id: "A" },
		{ id: "B" },
		{ id: "C" },
		{ id: "D" },
	]);

	const [links, setLinks] = useState([
		{ source: "A", target: "B" },
		{ source: "B", target: "C" },
		{ source: "C", target: "D" },
	]);

	useEffect(() => {
		const d3Nodes = nodes.map((d) => ({ ...d }));
		const d3Links = links.map((d) => ({
			...d,
			source: d3Nodes.find((n) => n.id === d.source),
			target: d3Nodes.find((n) => n.id === d.target),
		}));

		console.log(d3Links);

		const simulation = d3
			.forceSimulation(d3Nodes)
			.force(
				"link",
				d3
					.forceLink(d3Links)
					.id((d) => d.id)
					.distance(250)
			)
			.force("charge", d3.forceManyBody().strength(-100))
			.force("center", d3.forceCenter(540, 300));

		// animation
		const ticked = () => {
			setNodes(d3Nodes.map((d) => ({ ...d })));
			setLinks(d3Links.map((d) => ({ ...d })));
		};

		simulation.on("tick", ticked);

		return () => simulation.stop();
	}, []);

	return (
		<View>
			<Svg height="600" width="1080">
				{links.map((link, index) => (
					<>
						<Line
							key={index}
							x1={link.source.x}
							y1={link.source.y}
							x2={link.target.x}
							y2={link.target.y}
							stroke="black"
						/>
						<Path d={getArrowheadPath(link)} fill="black" />
					</>
				))}
				{nodes.map((node, index) => (
					<Circle
						key={index}
						cx={node.x}
						cy={node.y}
						r={25}
						fill="blue"
					/>
				))}
				{nodes.map((node, index) => (
					<Text
						key={index}
						x={node.x}
						y={node.y}
						fill="white"
						fontSize="16"
						textAnchor="middle"
						dy=".3em" // Centers text vertically
					>
						{node.id} {/* Replace with your desired label */}
					</Text>
				))}
			</Svg>
		</View>
	);
};

export default GraphComponent;
