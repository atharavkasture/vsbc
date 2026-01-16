import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const NodeButton = ({ type, label, colorClass = "border-blue-500 hover:bg-blue-50" }) => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`p-3 mb-2 border rounded-md cursor-grab bg-white text-gray-700 font-medium transition-all shadow-sm ${colorClass} hover:shadow-md`}
      onDragStart={(event) => onDragStart(event, type)}
      draggable
    >
      {label}
    </div>
  );
};

const Sidebar = ({ token, onProjectLoad }) => {
  const [functions, setFunctions] = useState([]);
  const [showFunctions, setShowFunctions] = useState(true);

  // FETCH FUNCTIONS FROM CLOUD
  const fetchFunctions = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/functions`, {
        headers: { 'Authorization': token }
      });
      setFunctions(res.data.functions || []);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    fetchFunctions();
  }, [token]);

  // DRAG HANDLER: Pass ID for Cloud retrieval
  const handleFunctionDragStart = (event, func) => {
    event.dataTransfer.setData('application/reactflow', 'functionCall');
    event.dataTransfer.setData('application/saved-function-id', func._id); // Pass MongoDB ID
    event.dataTransfer.effectAllowed = 'move';
  };

  const deleteFunction = async (e, id) => {
    e.stopPropagation();
    if(!window.confirm("Delete this function?")) return;
    try { 
        await axios.delete(`${API_URL}/functions/${id}`, {
            headers: { 'Authorization': token }
        }); 
        fetchFunctions(); // Refresh list
    } catch(e) { alert("Failed to delete"); }
  };

  return (
    <aside className="w-64 h-full flex flex-col p-4 bg-white border-r border-gray-200 shadow-sm overflow-y-auto sidebar-scrollbar">
      <h3 className="text-lg font-bold mb-4 text-gray-800 uppercase tracking-wider text-xs">Toolbox</h3>
      
      <div id="node-block-list" className="flex-shrink-0">
        <NodeButton type="assign" label="Declare Variable" colorClass="border-cyan-200 text-cyan-800" />
        <NodeButton type="assign2" label="Update Variable" colorClass="border-sky-200 text-sky-800" />
        <NodeButton type="array" label="Array Declaration" colorClass="border-blue-200 text-blue-800" />
        <NodeButton type="print" label="Print" colorClass="border-green-200 text-green-800" />
        <NodeButton type="if" label="If / Else" colorClass="border-red-200 text-red-800" />
        <NodeButton type="switch" label="Switch Case" colorClass="border-orange-200 text-orange-800" />
        <NodeButton type="for" label="For Loop" colorClass="border-indigo-200 text-indigo-800" />
        <NodeButton type="while" label="While Loop" colorClass="border-indigo-200 text-indigo-800" />
        <NodeButton type="createObject" label="Create Object" colorClass="border-teal-200 text-teal-800" />
        
        <div className="my-3 border-t border-gray-100"></div>

        <NodeButton type="classDefine" label="Define Class" colorClass="border-orange-200 text-orange-800" />
        <NodeButton type="functionDefine" label="Define Function" colorClass="border-purple-200 text-purple-800" />
        <NodeButton type="functionCall" label="Call Function" colorClass="border-fuchsia-200 text-fuchsia-800" />
      </div>

      {/* SAVED FUNCTIONS (CLOUD) */}
      <div className="mt-6 flex-shrink-0 pb-4">
        <button 
          onClick={() => setShowFunctions(!showFunctions)}
          className="flex items-center justify-between w-full text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors focus:outline-none mb-2"
        >
          <span>SAVED FUNCTIONS</span>
          <span>{showFunctions ? '▼' : '▶'}</span>
        </button>
        
        {showFunctions && (
          <div className="pl-1 transition-all">
             {functions.length === 0 && <p className="text-xs text-gray-400 italic">No functions saved yet.</p>}
             <ul className="space-y-1">
                {functions.map((func) => (
                  <li key={func._id} className="flex gap-2 items-center group">
                    <div 
                        className="flex-1 text-left px-3 py-2 rounded bg-purple-50 hover:bg-purple-100 text-purple-900 transition-colors cursor-grab text-sm truncate border border-purple-100"
                        draggable
                        onDragStart={(event) => handleFunctionDragStart(event, func)}
                        title={func.description || func.name}
                    >
                        {func.name}
                    </div>
                    <button onClick={(e) => deleteFunction(e, func._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <DeleteIcon />
                    </button>
                  </li>
                ))}
             </ul>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;