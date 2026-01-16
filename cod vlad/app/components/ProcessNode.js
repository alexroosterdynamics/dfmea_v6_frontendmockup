'use client';

import { useState, useRef, useEffect } from 'react';

const CONNECTION_TYPES = {
  SERIES: 'series',
  PARALLEL: 'parallel',
  SUBSTEP: 'substep',
  ROUTE: 'route',
  CONDITION: 'condition',
};

// Icons in exact order matching the diagram:
// LEFT: Route
// RIGHT: Series/Decision (top), Condition (bottom - diamond goes right then down)
// BOTTOM: SubStep (left), Parallel (center)
const connectionIcons = {
  [CONNECTION_TYPES.ROUTE]: {
    icon: '←',
    label: 'Route',
    position: 'left',
    color: '#f97316',
  },
  [CONNECTION_TYPES.SERIES]: {
    icon: '→',
    label: 'Series',
    position: 'right',
    color: '#3b82f6',
  },
  [CONNECTION_TYPES.CONDITION]: {
    icon: '◇',
    label: 'Condition', 
    position: 'bottom-right',
    color: '#06b6d4',
  },
  [CONNECTION_TYPES.SUBSTEP]: {
    icon: '↳',
    label: 'SubStep',
    position: 'bottom-left',
    color: '#8b5cf6',
  },
  [CONNECTION_TYPES.PARALLEL]: {
    icon: '⇊',
    label: 'Parallel',
    position: 'bottom',
    color: '#10b981',
  },
};

export default function ProcessNode({
  node,
  isSelected,
  onSelect,
  onAddConnection,
  onUpdateLabel,
  onDelete,
  onIconHover,
  hoveredIcon,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.label);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(node.label);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim()) {
      onUpdateLabel(editValue.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(node.label);
    }
  };

  const handleContainerMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleContainerMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      onIconHover(null);
    }, 150);
  };

  const handleIconMouseEnter = (type) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
    onIconHover(`${node.id}-${type}`);
  };

  const handleIconMouseLeave = () => {
    onIconHover(null);
  };

  const handleIconClick = (e, type) => {
    e.stopPropagation();
    e.preventDefault();
    onAddConnection(type);
  };

  const renderConnectionIcon = (type) => {
    const config = connectionIcons[type];
    const isHoveredIcon = hoveredIcon === `${node.id}-${type}`;
    const showIcon = isHovered;

    return (
      <button
        key={type}
        className={`connection-icon icon-${config.position} ${showIcon ? 'visible' : ''} ${isHoveredIcon ? 'active' : ''}`}
        style={{ '--icon-color': config.color }}
        onClick={(e) => handleIconClick(e, type)}
        onMouseEnter={() => handleIconMouseEnter(type)}
        onMouseLeave={handleIconMouseLeave}
        data-label={config.label}
        draggable={false}
      >
        <span className="icon-symbol">{config.icon}</span>
      </button>
    );
  };

  // Render icons in specific order: Route, Condition, SubStep, Series, Parallel
  const iconOrder = [
    CONNECTION_TYPES.ROUTE,
    CONNECTION_TYPES.CONDITION,
    CONNECTION_TYPES.SUBSTEP,
    CONNECTION_TYPES.SERIES,
    CONNECTION_TYPES.PARALLEL,
  ];

  return (
    <div
      className={`process-node-container ${isHovered ? 'hovered' : ''}`}
      style={{
        left: node.x,
        top: node.y,
      }}
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleContainerMouseLeave}
    >
      <div
        className={`process-node ${isSelected ? 'selected' : ''}`}
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
      >
        <div className="node-content">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="node-input"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="node-label">{node.label}</span>
          )}
        </div>

        {node.id !== 'start' && isHovered && (
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete node"
          >
            ×
          </button>
        )}

        {/* Connection icons in specific order */}
        <div className={`connection-icons ${isHovered ? 'show' : ''}`}>
          {iconOrder.map((type) => renderConnectionIcon(type))}
        </div>
      </div>
    </div>
  );
}
