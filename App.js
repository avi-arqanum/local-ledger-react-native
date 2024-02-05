import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, TextInput, Button } from "react-native";

import LocalLedger from "./src/localLedger/localLedger";
import PeerConnection from "./peer";
import { handleTransaction } from "./User";

const userPublicKey =
	"04f16f804244e46e2a09232d4aff3b59976b98fac14328a2d1a32496b49998f247cedabd9b82203f7e13d206fcdf4e33d92a6c53c26e5cce26d6579962c4e31df6";

const ledger = new LocalLedger();

export default function App() {
	const [recipientPublicKey, setPublicKey] = useState("");
	const [amount, setAmount] = useState(0);

	useEffect(() => {
		const initializeUser = async () => {
			try {
				await PeerConnection.startPeerSession(userPublicKey);
			} catch (error) {
				console.error(
					"Initialization or transaction handling failed:",
					error
				);
			}
		};

		initializeUser();
	}, []);

	const handleSubmit = async () => {
		console.log(recipientPublicKey, amount);

		const transactionData = ledger.generateTransaction(
			userPublicKey,
			recipientPublicKey,
			amount
		);

		await handleTransaction({ type: "payment", ...transactionData });
	};

	return (
		<View style={styles.formContainer}>
			<View style={styles.form}>
				<Text>Recipient public key:</Text>
				<TextInput
					style={styles.input}
					placeholder="64 digit hexadecimal string"
					value={recipientPublicKey}
					onChangeText={setPublicKey}
				/>

				<Text>Payment amount:</Text>
				<TextInput
					style={styles.input}
					placeholder="200"
					keyboardType="numeric"
					value={amount}
					onChangeText={(text) => setAmount(parseInt(text))}
				/>

				<View style={styles.buttonContainer}>
					<Button
						onPress={handleSubmit} // You need to add your submit function here
						title="Send"
					/>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	formContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	form: {
		width: "50%",
	},
	buttonContainer: {
		flexDirection: "row",
		justifyContent: "flex-end",
	},
	btn: {
		width: "50%",
	},
});
