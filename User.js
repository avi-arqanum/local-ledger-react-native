import PeerConnection from "./peer";

const transactionManagerId =
	"046eca335d9645307db441656ef4e65b4bfc579b27452bebc19bd870aa1118e5c3d50123b57a7a0710592f579074b875a03a496a3a3bf8ec34498a2f7805a08668";

export default handleTransaction = async (transactionData) => {
	console.log(transactionData);
	try {
		await PeerConnection.connectPeer(transactionManagerId);
		console.log("Connection with transaction manager established");

		await PeerConnection.sendConnection(
			transactionManagerId,
			transactionData
		);
		console.log("Transaction is sent for validation");

		PeerConnection.onConnectionReceiveData(
			transactionManagerId,
			handleTransactionResult
		);
	} catch (error) {
		console.log("Connection error:", error);
	}
};

const handleTransactionResult = (transactionResult) => {
	if (transactionResult.success) {
		console.log("Transaction is valid!");

		setTimeout(async () => {
			await PeerConnection.sendConnection(transactionManagerId, {
				type: "payment updated",
				success: true,
			});
			console.log("Payment update sent to transaction manager");
		}, 1000);
	} else {
		console.log("Transaction manager disapproved the transaction");
	}
};
