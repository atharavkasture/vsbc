import React, { useState, useEffect } from 'react';
import { Plus, Folder, Trash2, LogOut, Code } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001';

export default function Dashboard({ token, onLogout, onOpenProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/graphs`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = () => {
    const name = prompt("Enter Project Name:");
    if (!name) return;
    // Open editor with empty data and NO ID (indicating new)
    onOpenProject({ name, nodes: [], edges: [], code: '// Start coding...', _id: null }); 
  };

  const deleteProject = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
        await fetch(`${BACKEND_URL}/api/graphs/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': token }
        });
        fetchProjects(); // Refresh list
    } catch (err) {
        alert("Delete failed");
    }
  };

  const loadProject = async (id) => {
    try {
        const res = await fetch(`${BACKEND_URL}/api/graphs/${id}`, {
            headers: { 'Authorization': token }
        });
        const data = await res.json();
        onOpenProject(data);
    } catch (err) {
        alert("Failed to load project");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-slate-700 pb-6">
          <div className="flex items-center gap-3">
             <Code className="text-blue-500" size={32} />
             <h1 className="text-3xl font-bold">Your IDE Projects</h1>
          </div>
          <button onClick={onLogout} className="text-red-400 hover:text-red-300 flex items-center gap-2 font-bold px-4 py-2 hover:bg-red-500/10 rounded-lg transition-colors">
            <LogOut size={18}/> Logout
          </button>
        </div>

        {loading ? (
            <div className="text-center text-slate-500">Loading projects...</div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Create New Card */}
            <div 
                onClick={createProject}
                className="h-48 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-800 transition-all group"
            >
                <div className="bg-blue-600 rounded-full p-4 mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
                <Plus size={24} className="text-white"/>
                </div>
                <span className="font-bold text-slate-400 group-hover:text-white">Create New Project</span>
            </div>

            {/* Project List */}
            {projects.map(p => (
                <div 
                key={p._id}
                onClick={() => loadProject(p._id)}
                className="h-48 bg-slate-800 rounded-xl p-6 border border-slate-700 cursor-pointer hover:shadow-2xl hover:border-blue-500 hover:-translate-y-1 transition-all relative group flex flex-col justify-between"
                >
                <div>
                    <Folder size={32} className="text-blue-500 mb-4" />
                    <h3 className="font-bold text-lg truncate text-white">{p.name}</h3>
                </div>
                <div className="flex justify-between items-end">
                    <p className="text-xs text-slate-500">
                        {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                    <button 
                        onClick={(e) => deleteProject(p._id, e)}
                        className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-slate-700 rounded-full"
                        title="Delete Project"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
}