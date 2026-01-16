import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { graphToIR } from '../utils/irConverter';
import { getSubgraph } from '../utils/graphUtils';

const API_URL = 'http://localhost:3001/api';

const ControlPanel = ({ nodes, edges, project, token }) => {
  const [activeTab, setActiveTab] = useState('python');
  const [isLoading, setIsLoading] = useState(false);
  
  const [generatedCode, setGeneratedCode] = useState({ python: '', java: '', cpp: '', csharp: '' });
  
  const [executionResult, setExecutionResult] = useState({ stdout: '', stderr: '' });
  const [projectName, setProjectName] = useState(project?.name || '');
  const [saveStatus, setSaveStatus] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Function State
  const [availableFunctions, setAvailableFunctions] = useState([]);
  const [selectedFunctionId, setSelectedFunctionId] = useState('');
  const [functionDesc, setFunctionDesc] = useState('');
  const [saveFunctionStatus, setSaveFunctionStatus] = useState('');
  const [isSavingFunction, setIsSavingFunction] = useState(false);

  const handleCodeChange = (newCode) => {
    setGeneratedCode((prev) => ({ ...prev, [activeTab]: newCode }));
  };

  useEffect(() => {
    const funcs = nodes.filter(node => node.type === 'functionDefine');
    setAvailableFunctions(funcs);
    if (selectedFunctionId && !funcs.find(f => f.id === selectedFunctionId)) {
        setSelectedFunctionId('');
    }
  }, [nodes, selectedFunctionId]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setExecutionResult({ stdout: '', stderr: '' });
    try {
        const ir = graphToIR(nodes, edges);
        const [pyRes, javaRes, cppRes, csRes] = await Promise.all([
            axios.post(`${API_URL}/generate`, { language: 'python', ir }),
            axios.post(`${API_URL}/generate`, { language: 'java', ir }),
            axios.post(`${API_URL}/generate`, { language: 'cpp', ir }),
            axios.post(`${API_URL}/generate`, { language: 'csharp', ir })
        ]);

        setGeneratedCode({
            python: pyRes.data.code,
            java: javaRes.data.code,
            cpp: cppRes.data.code,
            csharp: csRes.data.code,
        });
    } catch (error) {
        setExecutionResult({ stdout: '', stderr: `Error: ${error.message}` });
    } finally {
        setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setExecutionResult({ stdout: '', stderr: '' });
    const code = generatedCode[activeTab];
    if (!code) { alert('Generate first!'); setIsLoading(false); return; }
    try {
        const response = await axios.post(`${API_URL}/execute`, { language: activeTab, code });
        setExecutionResult({ stdout: response.data.stdout, stderr: response.data.stderr });
    } catch (error) {
        setExecutionResult({ stdout: '', stderr: `Error: ${error.message}` });
    } finally {
        setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!projectName.trim()) return;
    setIsSavingProject(true);
    
    const payload = { 
        name: projectName.trim(), 
        nodes: nodes, 
        edges: edges, 
        diagram: { nodes, edges } 
    };

    try {
        if (token) {
            await axios.post(`${API_URL}/graphs`, {
                id: project?._id, 
                ...payload
            }, {
                headers: { 'Authorization': token }
            });
            setSaveStatus('Saved to Cloud!');
        } else {
            await axios.post(`${API_URL}/save-project`, payload);
            setSaveStatus('Saved Locally!');
        }
    } catch (error) {
        setSaveStatus('Failed'); 
    }
    setIsSavingProject(false);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // --- SAVE FUNCTION HANDLER (CLOUD) ---
  const handleSaveFunction = async () => {
    if (!selectedFunctionId) return;
    setIsSavingFunction(true);
    try {
        const rootNode = nodes.find(n => n.id === selectedFunctionId);
        const subgraph = getSubgraph(rootNode, nodes, edges);
        
        const functionData = { 
            name: rootNode.data.name, 
            params: rootNode.data.params.split(','), 
            desc: functionDesc, 
            diagram: subgraph 
        };

        if (token) {
            // Save to MongoDB
            await axios.post(`${API_URL}/functions`, { 
                name: rootNode.data.name, 
                description: functionDesc,
                functionData 
            }, {
                headers: { 'Authorization': token }
            });
            setSaveFunctionStatus('Saved to Cloud!');
        } else {
            // Fallback Local
            await axios.post(`${API_URL}/save-function`, { name: rootNode.data.name, functionData });
            setSaveFunctionStatus('Saved Locally!');
        }
    } catch (error) { 
        console.error(error);
        setSaveFunctionStatus('Failed'); 
    }
    setIsSavingFunction(false);
    setTimeout(() => setSaveFunctionStatus(''), 3000);
  };

  const getTabClass = (lang) => `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === lang ? 'text-blue-600 border-blue-600 bg-blue-50' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'}`;

  return (
    <div className="w-96 h-full p-4 bg-white border-l border-gray-200 shadow-xl flex flex-col overflow-y-auto">
        <div className="flex gap-2 mb-4 shrink-0">
            <button onClick={handleGenerate} disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded shadow-sm transition-colors">
                {isLoading ? '...' : 'Generate'}
            </button>
            <button onClick={handleExecute} disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2 px-4 rounded shadow-sm transition-colors">
                {isLoading ? '...' : 'Execute'}
            </button>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-4 shrink-0">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Project</label>
            <div className="flex gap-2 mb-2">
                <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project Name" className="flex-1 px-3 py-2 rounded bg-white text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm" />
                <button onClick={handleSave} disabled={isSavingProject} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded text-sm shadow-sm">Save</button>
            </div>
            {saveStatus && <div className="text-xs text-green-600 font-semibold">{saveStatus}</div>}
        </div>

        <div className="flex flex-col rounded-md mb-4 shrink-0 border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex bg-gray-50 border-b border-gray-200">
                {['python', 'java', 'cpp', 'csharp'].map(lang => (
                    <button key={lang} onClick={() => setActiveTab(lang)} className={getTabClass(lang)}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</button>
                ))}
            </div>
            <div className="relative flex-1 bg-[#1e1e1e] min-h-[250px]">
                <textarea
                    value={generatedCode[activeTab] || ''}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder={`// Click Generate...`}
                    spellCheck="false"
                    className="absolute inset-0 w-full h-full p-3 text-xs font-mono text-gray-200 bg-transparent border-none outline-none resize-none focus:ring-0"
                />
            </div>
        </div>

        <div className="flex flex-col bg-gray-900 rounded-md p-3 shrink-0 border border-gray-300 shadow-sm mb-4 min-h-[150px]">
            <h3 className="text-gray-400 text-xs uppercase font-bold border-b border-gray-700 pb-2 mb-2">Console</h3>
            <div className="flex-1 text-sm overflow-auto font-mono max-h-[200px]">
                {executionResult.stderr && <pre className="text-red-400 whitespace-pre-wrap">{executionResult.stderr}</pre>}
                {!executionResult.stderr && executionResult.stdout ? <pre className="text-green-400 whitespace-pre-wrap">{executionResult.stdout}</pre> : <span className="text-gray-600 italic">Ready...</span>}
            </div>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-4 shrink-0">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Save Reusable Function</h3>
            <div className="flex flex-col gap-2">
                <select value={selectedFunctionId} onChange={(e) => setSelectedFunctionId(e.target.value)} className="px-3 py-2 rounded bg-white text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm">
                    <option value="">-- Select Function Block --</option>
                    {availableFunctions.map(fn => <option key={fn.id} value={fn.id}>{fn.data.name || 'Untitled'}</option>)}
                </select>
                <input type="text" value={functionDesc} onChange={e => setFunctionDesc(e.target.value)} placeholder="Description (optional)" className="px-3 py-2 rounded bg-white text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm" />
                <button onClick={handleSaveFunction} disabled={isSavingFunction || availableFunctions.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded text-sm shadow-sm transition-colors">Save Function</button>
            </div>
            {saveFunctionStatus && <div className="mt-2 text-xs text-green-600 font-semibold">{saveFunctionStatus}</div>}
        </div>
    </div>
  );
};

export default ControlPanel;