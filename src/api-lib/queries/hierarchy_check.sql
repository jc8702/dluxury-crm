-- Consulta para verificar a hierarquia completa Categorias -> Famílias -> Subfamílias
-- Útil para validação da taxonomia industrial e geração de relatórios de BI

SELECT 
    c.id as cat_id,
    c.nome as categoria,
    f.nome as familia,
    s.nome as subfamilia
FROM erp_categories c
INNER JOIN erp_families f ON f.categoria_id = c.id
LEFT JOIN erp_subfamilies s ON s.familia_id = f.id
ORDER BY c.nome, f.nome, s.nome;
