import React, { useState } from 'react';
import { 
  Code2, 
  Folder, 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Award, 
  Layers, 
  Search,
  ExternalLink,
  BookOpen,
  Terminal
} from 'lucide-react';
import { JAVA_PROJECT_FILES } from '../../data/javaSourceCode';
import { JavaSourceFile } from '../../types';
import { downloadMavenProjectZip } from '../../services/javaSimulator';

export const JavaCodeStudio: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<JavaSourceFile>(JAVA_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = ['ALL', 'MODEL', 'DAO', 'SERVICE', 'SERVLET', 'FILTER', 'THREAD', 'TEST', 'SQL', 'CONFIG'];

  const filteredFiles = JAVA_PROJECT_FILES.filter(file => {
    if (activeCategory !== 'ALL' && file.category !== activeCategory) return false;
    if (filterQuery && !file.fileName.toLowerCase().includes(filterQuery.toLowerCase()) && !file.path.toLowerCase().includes(filterQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 rounded-full font-mono flex items-center space-x-1">
              <Code2 className="w-3.5 h-3.5 mr-1" />
              JAVA ARCHITECTURE &amp; SOURCE REPOSITORY
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Space_Grotesk']">
            Production Java EE Codebase
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Inspect the complete, modular Java project fulfilling every criterion in the Web-Based Project Rubric: OOP encapsulation, JDBC transactions, thread synchronization, and Jakarta Servlets.
          </p>
        </div>

        <button
          onClick={downloadMavenProjectZip}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Download Maven Project (.ZIP)</span>
        </button>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: File Tree Explorer */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search Java files..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto max-h-[560px] space-y-1 pr-1">
            {filteredFiles.map(file => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start space-x-2.5 ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-600/60 text-white shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <FileCode className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate font-mono text-slate-200">{file.fileName}</p>
                    <p className="text-[10px] text-slate-500 truncate font-mono">{file.package}</p>
                    <span className="inline-block mt-1 text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 font-medium">
                      {file.rubricCategory}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* Right: Code Viewer & Rubric Annotation */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Rubric Alignment Card */}
          <div className="p-4 bg-slate-900 border border-indigo-900/40 rounded-2xl flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Marking Rubric Alignment: {selectedFile.rubricCategory}
                </span>
              </div>
              <p className="text-xs text-slate-300">{selectedFile.description}</p>
              <p className="text-[11px] text-slate-500 font-mono">Location: {selectedFile.path}</p>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Syntax Code Container */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-slate-400 font-medium pl-2">{selectedFile.path}</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-400 uppercase bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                {selectedFile.category}
              </span>
            </div>

            <div className="p-4 overflow-x-auto max-h-[580px] font-mono text-xs leading-relaxed text-slate-200 selection:bg-indigo-500/40">
              <pre className="text-[12px] font-['Fira_Code']">
                {selectedFile.code}
              </pre>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

