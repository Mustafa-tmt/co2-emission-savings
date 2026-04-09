# Database schema (public)

Generated from PostgreSQL `information_schema`. Source: `smartphone-carbon-model`.

## Table: `components`

| Column               | Type                     | Nullable | Default                          |
|----------------------|--------------------------|----------|----------------------------------|
| component_id         | integer                  | NOT NULL | nextval('components_component_id_seq'::regclass) |
| device_id            | integer                  | NOT NULL | —                                |
| component_name       | character varying(255)   | NOT NULL | —                                |
| co2_emitted          | double precision         | NOT NULL | —                                |
| global_warming_pct   | double precision         | NULL     | —                                |

## Table: `devices`

| Column                | Type                     | Nullable | Default                          |
|-----------------------|--------------------------|----------|----------------------------------|
| device_id             | integer                  | NOT NULL | nextval('devices_device_id_seq'::regclass) |
| model_code            | character varying(100)   | NOT NULL | —                                |
| model_name            | character varying(255)   | NOT NULL | —                                |
| dimension_mm          | character varying(100)   | NULL     | —                                |
| display_mm            | double precision         | NULL     | —                                |
| weight_product_acc_g  | integer                  | NULL     | —                                |
| weight_packages_g     | integer                  | NULL     | —                                |
| region                | character varying(20)    | NOT NULL | —                                |
| manufacturing_co2     | double precision         | NOT NULL | —                                |
| distribution_co2      | double precision         | NULL     | —                                |
| use_co2               | double precision         | NULL     | —                                |
| disposal_co2          | double precision         | NULL     | —                                |

## Table: `repair_jobs`

Loaded from `data/repairs.csv`. `job_id` is unique; re-seeding upserts on conflict.

| Column               | Type                     | Nullable | Default |
|----------------------|--------------------------|----------|---------|
| repair_job_id        | integer                  | NOT NULL | serial  |
| job_id               | bigint                   | NOT NULL | —       |
| imei                 | character varying(20)    | NULL     | —       |
| sn                   | character varying(64)    | NULL     | —       |
| make                 | character varying(100)   | NULL     | —       |
| model                | character varying(255)   | NULL     | —       |
| color                | character varying(100)   | NULL     | —       |
| memory               | character varying(64)    | NULL     | —       |
| device_type          | character varying(100)   | NULL     | —       |
| model_code           | character varying(100)   | NULL     | —       |
| last_repair_status   | character varying(64)    | NULL     | —       |
| defect_type          | character varying(32)    | NULL     | —       |
| defect_desc          | text                     | NULL     | —       |
| repair_description   | text                     | NULL     | —       |
| part1 … part15       | character varying(64)    | NULL     | —       |
| qty1 … qty15         | integer                  | NULL     | —       |

## Table: `part_descp`

Samsung part catalog from `data/parts_descp.csv`. `part_no` is the primary key; re-seeding upserts on conflict. Duplicate part numbers in the file keep the last row.

| Column      | Type                   | Nullable | Default |
|-------------|------------------------|----------|---------|
| part_no     | character varying(80)  | NOT NULL | —       |
| description | text                   | NULL     | —       |
| logic       | text                   | NULL     | —       |
| category    | text                   | NULL     | —       |

## Table: `defect_descp`

Defect-type reference from `data/defect_descp.csv`. `defect_type` is the primary key; re-seeding upserts on conflict.

| Column       | Type                    | Nullable | Default |
|--------------|-------------------------|----------|---------|
| defect_type  | character varying(32)   | NOT NULL | —       |
| description  | text                    | NULL     | —       |

---

*Run `npm run db:schema` to re-fetch the schema.*
