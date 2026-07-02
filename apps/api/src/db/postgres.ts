import { Pool } from "pg";

export function createPostgresPool(connectionString: string) {
	return new Pool({
		connectionString,
		max: 10,
	});
}

export async function closePostgresPool(pool: Pool) {
	await pool.end();
}
