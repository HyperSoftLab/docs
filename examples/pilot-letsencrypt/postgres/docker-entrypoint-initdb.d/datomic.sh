#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE datomic;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname datomic <<-EOSQL
  CREATE TABLE datomic_kvs
  (
   id text NOT NULL,
   rev integer,
   map text,
   val bytea,
   CONSTRAINT pk_id PRIMARY KEY (id)
  )
  WITH (
   OIDS=FALSE
  );
EOSQL
