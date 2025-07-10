import React, { useEffect, useState, useMemo } from 'react';
import MapCanvas from './MapCanvas';

interface MapPoint {
  cell_x: number;
  cell_y: number;
  config_type: string;
  id?: number;
  metadata?: { groupName:string; department: string; class: string; };
}

const API_BASE = process.env.REACT_APP_API_BASE || '/api';
const CELL_TYPES = [
  'TURNING_POINT',
  'FIXTURE',
  'ENTRY_GATE',
  'EXIT_GATE',
];

// Parse the CSV structure for group -> department -> class
const GROUP_DEPT_CLASS: Record<string, Record<string, string[]>> = {
  "Furniture": {
    "Bedroom": ["Bed Sets", "Bedroom Storage", "Beds", "Mattresses", "Wardrobes"],
    "Dining": ["Serving & Storage", "Tables & Chairs"],
    "Living": ["HOSO", "Living Case Goods", "Outdoor"],
    "Sofas & Tables": ["CT / ET", "Fabric Sofas", "Individual Sofas", "Modular Sofas", "Non-Fabric Sofas", "Recliners"]
  },
  "House Hold": {
    "Bathroom": ["Bath Accessories", "Bath Textiles", "Shower"],
    "Cash Tills": ["Cash Tills"],
    "Festive": ["Christmas", "Festivals"],
    "Floor Covering": ["Floor Accessories", "Rugs"],
    "Home Decor": ["Decor Accessories", "Home Fragrance", "Indoor Garden"],
    "Kitchen": ["Cookware", "Kitchen Linen", "Kitchen Storage", "Kitchenwares"],
    "Lighting": ["Core Electrical", "Lamps", "Lights"],
    "Soft Furnishing": ["Bed Linen", "Bed Protection", "Cushions", "Duvets & Pillows", "Throws & Blankets", "Window Treatments"],
    "Tabletop": ["Dinnerware", "Drinkware", "Flatware", "Outdoor Dining", "Serve", "Table Linen"],
    "Utility & Storage": ["Cleaning", "Laundry", "Storage"],
    "Wall Decor": ["Clocks", "Mirrors", "Photo Frames", "Wall Art"]
  },
  "Kids": {
    "Cash Tills": ["Cash Tills"],
    "Festive": ["Festivals"],
    "Kids Furniture": ["Kids Beds", "Mattresses", "Nursery", "Room Furniture & Storage"],
    "Room Decor": ["Decorative", "Floor Covering", "Lighting"],
    "Soft Furnishing": ["Bed Linen", "Window Treatments"],
    "Toys & Activities": ["Activities", "Kids Toys"],
    "Utility & Storage": ["Bath", "Eat & Drink", "Luggage", "Safety", "Storage"]
  }
};
const GROUP_NAMES = Object.keys(GROUP_DEPT_CLASS);

function getRoleFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.role || null;
  } catch {
    return null;
  }
}

const ConfigureMap: React.FC<{ token: string }> = ({ token }) => {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [newPoints, setNewPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string>('');
  const [addForm, setAddForm] = useState<{ cell_x: string; cell_y: string; config_type: string }>({
    cell_x: '',
    cell_y: '',
    config_type: CELL_TYPES[0]
  });
  const [fixtureMeta, setFixtureMeta] = useState({ groupName: '', department: '', class: '' });
  const [pulseCell, setPulseCell] = useState<{ x: number; y: number } | null>(null);
  const isSuperuser = useMemo(() => getRoleFromToken(token) === 'SUPERUSER', [token]);

  useEffect(() => {
    fetch(`${API_BASE}/map-configurations`, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(res => res.json())
      .then(data => setPoints(data || []));
  }, [token]);

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Pulse effect for add form
  useEffect(() => {
    const cell_x = parseInt(addForm.cell_x, 10);
    const cell_y = parseInt(addForm.cell_y, 10);
    if (!isNaN(cell_x) && !isNaN(cell_y)) {
      setPulseCell({ x: cell_x, y: cell_y });
      const t = setTimeout(() => setPulseCell(null), 600);
      return () => clearTimeout(t);
    } else {
      setPulseCell(null);
    }
  }, [addForm.cell_x, addForm.cell_y]);

  const isDuplicate = (cell_x: number, cell_y: number, config_type: string) => {
    return (
      points.some(pt => pt.cell_x === cell_x && pt.cell_y === cell_y && pt.config_type === config_type && !deletedIds.has(pt.id!)) ||
      newPoints.some(pt => pt.cell_x === cell_x && pt.cell_y === cell_y && pt.config_type === config_type)
    );
  };

  const handleAddPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const cell_x = parseInt(addForm.cell_x, 10);
    const cell_y = parseInt(addForm.cell_y, 10);
    if (isNaN(cell_x) || isNaN(cell_y) || !addForm.config_type) {
      setToast('Please enter valid grid coordinates and type.');
      return;
    }
    if (isDuplicate(cell_x, cell_y, addForm.config_type)) {
      setToast('Point already exists.');
      return;
    }
    if (addForm.config_type === 'FIXTURE') {
      if (!fixtureMeta.groupName || !fixtureMeta.department || !fixtureMeta.class) {
        setToast('Please select group, department, and class for fixture.');
        return;
      }
      // Validate that the selected department and class are valid for the group
      if (!GROUP_DEPT_CLASS[fixtureMeta.groupName][fixtureMeta.department] ||
          !GROUP_DEPT_CLASS[fixtureMeta.groupName][fixtureMeta.department].includes(fixtureMeta.class)) {
        setToast('Invalid department or class selection.');
        return;
      }
      setNewPoints(prev => [...prev, { cell_x, cell_y, config_type: addForm.config_type, metadata: { ...fixtureMeta } }]);
      setFixtureMeta({ groupName: '', department: '', class: '' });
    } else {
      setNewPoints(prev => [...prev, { cell_x, cell_y, config_type: addForm.config_type }]);
    }
    setAddForm({ cell_x: '', cell_y: '', config_type: CELL_TYPES[0] });
  };

  const handleDeletePoint = (id?: number, idx?: number) => {
    if (id) {
      setDeletedIds(prev => new Set(prev).add(id));
    } else if (typeof idx === 'number') {
      setNewPoints(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleSave = async () => {
    if (!isSuperuser) return;
    setLoading(true);
    // Delete points
    if (deletedIds.size > 0) {
      try {
        const res = await fetch(`${API_BASE}/map-configurations`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ ids: Array.from(deletedIds) })
        });
        if (!res.ok) {
          const err = await res.json();
          setToast(err.error || 'Delete failed.');
          setLoading(false);
          return;
        }
      } catch {
        setToast('Network error');
        setLoading(false);
        return;
      }
    }
    // Insert new points
    if (newPoints.length > 0) {
      try {
        const res = await fetch(`${API_BASE}/map-configurations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ configs: newPoints })
        });
        if (!res.ok) {
          const err = await res.json();
          setToast(err.error || 'Insert failed.');
          setLoading(false);
          return;
        }
      } catch {
        setToast('Network error');
        setLoading(false);
        return;
      }
    }
    if (deletedIds.size === 0 && newPoints.length === 0) {
      setToast('No new points to insert.');
      setLoading(false);
      return;
    }
    // Reload points
    const data = await fetch(`${API_BASE}/map-configurations`, { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json());
    setPoints(data || []);
    setDeletedIds(new Set());
    setNewPoints([]);
    setToast('Changes saved!');
    setLoading(false);
  };

  const visiblePoints = points.filter(pt => !deletedIds.has(pt.id!));

  // Handler to set addForm cell_x and cell_y from canvas click
  const handleCanvasCellClick = (cell: { x: number; y: number }) => {
    setAddForm(f => ({ ...f, cell_x: String(cell.x), cell_y: String(cell.y) }));
  };

  if (!isSuperuser) return <div className="text-danger p-4">Access denied. Superuser only.</div>;

  return (
    <div style={{ background: '#181818', minHeight: '100vh', color: '#fff', padding: 24, position: 'relative' }}>
      <h2>Configure Map</h2>
      {/* Toast */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1080, minWidth: 320 }}
      >
        {toast && (
          <div className="toast show align-items-center text-bg-info border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true" style={{ minWidth: 320 }}>
            <div className="d-flex">
              <div className="toast-body">{toast}</div>
            </div>
          </div>
        )}
      </div>
      {/* Add Point Form */}
      <form className="row g-2 align-items-end mb-3" onSubmit={handleAddPoint} style={{ maxWidth: 400 }}>
        <div className="col">
          <label className="form-label">Cell X</label>
          <input type="number" className="form-control" value={addForm.cell_x} onChange={e => setAddForm(f => ({ ...f, cell_x: e.target.value }))} required />
        </div>
        <div className="col">
          <label className="form-label">Cell Y</label>
          <input type="number" className="form-control" value={addForm.cell_y} onChange={e => setAddForm(f => ({ ...f, cell_y: e.target.value }))} required />
        </div>
        <div className="col">
          <label className="form-label">Type</label>
          <select className="form-select" value={addForm.config_type} onChange={e => setAddForm(f => ({ ...f, config_type: e.target.value }))}>
            {CELL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        {addForm.config_type === 'FIXTURE' && (
          <div className="col-12">
            <div className="row g-2">
              <div className="col">
                <label className="form-label">Group Name</label>
                <select className="form-select" value={fixtureMeta.groupName} onChange={e => setFixtureMeta(f => ({ groupName: e.target.value, department: '', class: '' }))} required>
                  <option value="">Select</option>
                  {GROUP_NAMES.map(gpName => <option key={gpName} value={gpName}>{gpName}</option>)}
                </select>
              </div>
              <div className="col">
                <label className="form-label">Department</label>
                <select className="form-select" value={fixtureMeta.department} onChange={e => setFixtureMeta(f => ({ ...f, department: e.target.value, class: '' }))} required disabled={!fixtureMeta.groupName}>
                  <option value="">Select</option>
                  {fixtureMeta.groupName && Object.keys(GROUP_DEPT_CLASS[fixtureMeta.groupName] || {}).map(dep => <option key={dep} value={dep}>{dep}</option>)}
                </select>
              </div>
              <div className="col">
                <label className="form-label">Class</label>
                <select className="form-select" value={fixtureMeta.class} onChange={e => setFixtureMeta(f => ({ ...f, class: e.target.value }))} required disabled={!fixtureMeta.department}>
                  <option value="">Select</option>
                  {fixtureMeta.groupName && fixtureMeta.department && (GROUP_DEPT_CLASS[fixtureMeta.groupName][fixtureMeta.department] || []).map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
        <div className="col-auto">
          <button type="submit" className="btn btn-primary">Add Point</button>
        </div>
      </form>
      <button className="btn btn-success mb-3" onClick={handleSave} disabled={loading}>Save</button>
      <MapCanvas
        arrows={[]}
        onArrowDraw={() => {}}
        backgroundImage={process.env.PUBLIC_URL + '/store.jpg'}
        points={visiblePoints.concat(newPoints).map(pt => ({
          x: pt.cell_x * 10, // convert cell to pixel
          y: pt.cell_y * 10, // convert cell to pixel
          config_type: pt.config_type,
          id: pt.id
        }))}
        showGrid={true}
        pulseCell={pulseCell ? { x: pulseCell.x, y: pulseCell.y } : undefined}
        onCellClick={handleCanvasCellClick}
      />
      <div className="mt-3">
        <h5>Points</h5>
        <ul className="list-group">
          {visiblePoints.map(pt => (
            <li
              key={pt.id || `${pt.cell_x},${pt.cell_y},${pt.config_type}`}
              className="list-group-item list-group-item-dark d-flex justify-content-between align-items-center"
            >
              ({pt.cell_x}, {pt.cell_y}) - {pt.config_type} <span className="badge bg-secondary">id: {pt.id}</span>
              {pt.config_type === 'FIXTURE' && pt.metadata && (
                <span className="ms-2 small text-info">{JSON.stringify(pt.metadata)}</span>
              )}
              <button className="btn btn-sm btn-danger ms-2" onClick={() => handleDeletePoint(pt.id)} title="Delete"><i className="bi bi-trash"></i></button>
            </li>
          ))}
          {newPoints.map((pt, idx) => (
            <li
              key={`new-${idx}`}
              className="list-group-item list-group-item-info d-flex justify-content-between align-items-center"
            >
              ({pt.cell_x}, {pt.cell_y}) - {pt.config_type} <span className="badge bg-info">new</span>
              {pt.config_type === 'FIXTURE' && pt.metadata && (
                <span className="ms-2 small text-info">{JSON.stringify(pt.metadata)}</span>
              )}
              <button className="btn btn-sm btn-danger ms-2" onClick={() => handleDeletePoint(undefined, idx)} title="Delete"><i className="bi bi-trash"></i></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ConfigureMap;
