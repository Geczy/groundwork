import type { Database as GeneratedDatabase } from './database-generated.types';
import { databaseSchema } from './database-schema.generated';

export { databaseSchema } from './database-schema.generated';
export type { Json } from './database-generated.types';

export type Database = GeneratedDatabase;
type AppDatabaseSchema = Database[typeof databaseSchema];

export type TableName = keyof AppDatabaseSchema['Tables'];
export type ViewName = keyof AppDatabaseSchema['Views'];
export type RpcName = keyof AppDatabaseSchema['Functions'];
export type EnumName = keyof AppDatabaseSchema['Enums'];

export type Tables<Name extends TableName> = AppDatabaseSchema['Tables'][Name] extends {
  Row: infer Row;
}
  ? Row
  : never;

export type TablesInsert<Name extends TableName> = AppDatabaseSchema['Tables'][Name] extends {
  Insert: infer Insert;
}
  ? Insert
  : never;

export type TablesUpdate<Name extends TableName> = AppDatabaseSchema['Tables'][Name] extends {
  Update: infer Update;
}
  ? Update
  : never;

export type Views<Name extends ViewName> = AppDatabaseSchema['Views'][Name] extends {
  Row: infer Row;
}
  ? Row
  : never;

export type RpcArgs<Name extends RpcName> = AppDatabaseSchema['Functions'][Name] extends {
  Args: infer Args;
}
  ? Args
  : never;

export type RpcReturns<Name extends RpcName> = AppDatabaseSchema['Functions'][Name] extends {
  Returns: infer Returns;
}
  ? Returns
  : never;

export type Enums<Name extends EnumName> = AppDatabaseSchema['Enums'][Name];
