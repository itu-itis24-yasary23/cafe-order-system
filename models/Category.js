const { query, queryOne, run } = require('../database/db');

class Category {
    static getAll() {
        return query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    }

    static getById(id) {
        return queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    }

    static getBySlug(slug) {
        return queryOne('SELECT * FROM categories WHERE slug = ?', [slug]);
    }

    static create(name, slug, emoji, sort_order = 0) {
        const result = run(
            'INSERT INTO categories (name, slug, emoji, sort_order) VALUES (?, ?, ?, ?)',
            [name, slug, emoji, sort_order]
        );
        return this.getById(result.lastInsertRowid);
    }

    static update(id, data) {
        const { name, slug, emoji, sort_order } = data;
        const current = this.getById(id);
        if (!current) return null;

        run(`
      UPDATE categories 
      SET name = ?,
          slug = ?,
          emoji = ?,
          sort_order = ?
      WHERE id = ?
    `, [
            name ?? current.name,
            slug ?? current.slug,
            emoji ?? current.emoji,
            sort_order ?? current.sort_order,
            id
        ]);
        return this.getById(id);
    }

    static delete(id) {
        const category = this.getById(id);
        if (!category) return null;

        // Check if any items are using this category
        const items = query('SELECT COUNT(*) as count FROM menu_items WHERE category = ?', [category.slug]);
        if (items[0].count > 0) {
            throw new Error(`Cannot delete category "${category.name}" because it contains menu items.`);
        }

        run('DELETE FROM categories WHERE id = ?', [id]);
        return category;
    }
}

module.exports = Category;
