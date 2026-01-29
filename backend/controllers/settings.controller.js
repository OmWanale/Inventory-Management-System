const pool = require('../config/database');

// Get all settings
exports.getSettings = async (req, res) => {
  try {
    const [settings] = await pool.query(
      'SELECT config_key, config_value FROM system_config'
    );

    // Convert array to object
    const settingsObj = {};
    settings.forEach(s => {
      try {
        settingsObj[s.config_key] = JSON.parse(s.config_value);
      } catch (e) {
        settingsObj[s.config_key] = s.config_value;
      }
    });

    res.json({
      success: true,
      data: settingsObj,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      const configValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      // Upsert setting
      await connection.query(
        `INSERT INTO system_config (config_key, config_value, updated_at, updated_by)
         VALUES (?, ?, NOW(), ?)
         ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW(), updated_by = ?`,
        [key, configValue, req.user.id, configValue, req.user.id]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};
