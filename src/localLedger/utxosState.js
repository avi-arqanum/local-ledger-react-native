import { LevelDB } from "react-native-leveldb";

const initializeDatabase = () => {
	try {
		const db = new LevelDB("utxo.db", true, false);
		return db;
	} catch (error) {
		console.error("Database initialization failed:", error);
	}
};

const db = initializeDatabase();

const UTXODatabase = {
	getUTXO: (db, transactionId, outputIndex) => {
		const key = `${transactionId}:${outputIndex}`;
		try {
			const value = db.getStr(key);
			return value.split(",");
		} catch (error) {
			console.error("Error retrieving UTXO:", error);
			return null;
		}
	},

	addUTXO: (db, utxo) => {
		const { transactionId, outputIndex, amount, publicKey } = utxo;

		const key = `${transactionId}:${outputIndex}`;
		const value = `${amount},${publicKey}`;

		try {
			db.put(key, value);
		} catch (error) {
			console.error("Error adding UTXO:", error);
		}
	},

	deleteUTXO: (db, transactionId, outputIndex) => {
		const key = `${transactionId}:${outputIndex}`;
		try {
			db.del(key);
		} catch (error) {
			console.error("Error deleting UTXO:", error);
		}
	},
};
