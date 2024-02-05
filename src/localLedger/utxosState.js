import { LevelDB } from "react-native-leveldb";

export default class utxosState {
	constructor() {
		this.Db = new LevelDB("utxosStateDB", true, false);
	}

	getUTXO(transactionId, outputIndex) {
		const key = `${transactionId}:${outputIndex}`;
		try {
			const value = this.Db.getStr(key);
			return value.split(",");
		} catch (error) {
			console.error("Error retrieving UTXO:", error);
			return null;
		}
	}

	addUTXO(utxo) {
		const { transactionId, outputIndex, amount, publicKey } = utxo;

		const key = `${transactionId}:${outputIndex}`;
		const value = `${amount},${publicKey}`;

		try {
			this.Db.put(key, value);
		} catch (error) {
			console.error("Error adding UTXO:", error);
		}
	}

	deleteUTXO(utxo) {
		const { transactionId, outputIndex } = utxo;

		const key = `${transactionId}:${outputIndex}`;
		try {
			this.Db.del(key);
		} catch (error) {
			console.error("Error deleting UTXO:", error);
		}
	}
}
