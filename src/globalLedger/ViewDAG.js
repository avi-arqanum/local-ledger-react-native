import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { Svg, Circle, Line, Text } from "react-native-svg";
import * as d3 from "d3";

import DAG from "./dag";

const ViewDAG = () => {
	const [nodes, setNodes] = useState([]);
	const [links, setLinks] = useState([]);

	useEffect(() => {
		const dag = new DAG();

		dag.addTransaction(
			"transactionId1",
			[],
			[
				{
					transactionId: "transactionId1",
					outputIndex: 0,
					amount: 10,
					publicKey: "publicKey1",
				},
			]
		);

		dag.addTransaction(
			"transactionId2",
			[
				{
					transactionId: "transactionId1",
					outputIndex: 0,
					amount: 10,
					publicKey: "publicKey1",
				},
			],
			[
				{
					transactionId: "transactionId2",
					outputIndex: 0,
					amount: 10,
					publicKey: "publicKey2",
				},
			]
		);

		dag.addTransaction(
			"transactionId3",
			[
				{
					transactionId: "transactionId2",
					outputIndex: 0,
					amount: 10,
					publicKey: "publicKey2",
				},
			],
			[
				{
					transactionId: "transactionId3",
					outputIndex: 0,
					amount: 9,
					publicKey: "publicKey3",
				},
				{
					transactionId: "transactionId3",
					outputIndex: 1,
					amount: 1,
					publicKey: "publicKey2",
				},
			]
		);

		dag.addTransaction(
			"transactionId4",
			[],
			[
				{
					transactionId: "transactionId4",
					outputIndex: 0,
					amount: 5,
					publicKey: "publicKey1",
				},
				{
					transactionId: "transactionId4",
					outputIndex: 1,
					amount: 5,
					publicKey: "publicKey2",
				},
			]
		);

		const { d3Nodes, d3Links } = dag.drawStructure();

		const simulation = d3
			.forceSimulation(d3Nodes)
			.force(
				"link",
				d3
					.forceLink(d3Links)
					.id((d) => d.id)
					.distance(250)
			)
			.force("charge", d3.forceManyBody().strength(-150))
			.force("center", d3.forceCenter(540, 300));

		// animation
		const ticked = () => {
			setNodes([...d3Nodes]);
			setLinks(
				d3Links.map((d) => ({
					...d,
					source: { ...d.source },
					target: { ...d.target },
				}))
			);
		};

		simulation.on("tick", ticked);

		return () => simulation.stop();
	}, []);

	return (
		<View>
			<Svg height="600" width="1080">
				{links.map((link, index) => (
					<Line
						key={index}
						x1={link.source.x}
						y1={link.source.y}
						x2={link.target.x}
						y2={link.target.y}
						stroke="black"
					/>
				))}
				{nodes.map((node, index) => (
					<Circle
						key={index}
						cx={node.x}
						cy={node.y}
						r={50}
						fill="#00C0FF"
					/>
				))}

				{nodes.map((node, index) => (
					<Text
						key={index}
						x={node.x}
						y={node.y}
						fill="white"
						fontSize="21"
						textAnchor="middle"
						dy=".3em" // Centers text vertically
					>
						{node.id[node.id.length - 1]}{" "}
					</Text>
				))}
			</Svg>
		</View>
	);
};

export default ViewDAG;
