-- Agregar columna contribuyente_iva si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes' 
        AND column_name = 'contribuyente_iva'
    ) THEN
        ALTER TABLE clientes 
        ADD COLUMN contribuyente_iva BOOLEAN DEFAULT FALSE;
        
        CREATE INDEX IF NOT EXISTS clientes_contribuyente_iva_idx 
        ON clientes(contribuyente_iva);
    END IF;
END $$;



