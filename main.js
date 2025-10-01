import xxhash from "xxhash-wasm";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";

const findCollision = async () => {
    console.log("Starting brute-force attempt to find a hash collision...");
    console.log("Will check 20 million UUIDs and then stop. This will take some time.");
    console.log("Using SQLite database for unlimited hash storage and h64 method.");
    console.log("Storing hash values as strings in the same format as console log output.\n");

    // Create SQLite database in memory for better performance
    const db = new Database(":memory:");

    // Create table to store hash string -> input mappings
    db.exec(`
        CREATE TABLE hashes (
            hash TEXT PRIMARY KEY,
            input TEXT NOT NULL
        )
    `);

    // Prepare statements for better performance
    const insertStmt = db.prepare("INSERT OR IGNORE INTO hashes (hash, input) VALUES (?, ?)");
    const findStmt = db.prepare("SELECT input FROM hashes WHERE hash = ?");
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM hashes");

    const xxhashModule = await xxhash();
    const h64 = xxhashModule.h64;

    // We use BigInt for the counter in case it runs for a very, very long time.
    const maxIterations = 20000000n;

    for (let i = 0n; i < maxIterations; i++) {
        // Generate a random UUID as input
        const input = randomUUID();

        // Calculate hash using h64 method with string input
        const currentHash = h64(input);

        // Convert BigInt hash to string for storage (same format as console log)
        const hashStr = currentHash.toString(10);

        // Output the hash64 to console (using the same hashStr variable)
        console.log(`UUID: ${input} -> Hash64: ${hashStr}`);

        // Check if we've seen this hash before
        const existing = findStmt.get(hashStr);
        if (existing) {
            console.log("\n!!! COLLISION FOUND !!!");
            console.log(`Input "${input}" and Input "${existing.input}" both produce the hash: ${currentHash}`);
            db.close();
            return;
        }

        // Store the new hash (as string, matching console log format)
        insertStmt.run(hashStr, input);

        // Log progress every 1 million UUIDs so we know it's working
        if (i % 1000000n === 0n && i > 0n) {
            const hashCount = countStmt.get().count;
            console.log(`Checked ${i.toLocaleString()} UUIDs... No collision yet. (${hashCount.toLocaleString()} unique hashes stored)`);
        }
    }

    const finalCount = countStmt.get().count;
    console.log(`\nCompleted checking ${maxIterations.toLocaleString()} UUIDs.`);
    console.log(`Total unique hashes stored: ${finalCount.toLocaleString()}`);
    console.log("No hash collision found. This demonstrates how good xxHash is!");

    // Clean up database
    db.close();
};

findCollision().catch(console.error);
