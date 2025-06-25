import React, { useState } from 'react';
import './App.css';

function App() {
  // State Management
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [tax, setTax] = useState({ type: 'percentage', value: 0 });
  const [tip, setTip] = useState({ percentage: 0 });
  const [rounding, setRounding] = useState('none');
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Reset Function
  const resetAll = () => {
    setItems([]);
    setPeople([]);
    setAssignments({});
    setTax({ type: 'percentage', value: 0 });
    setTip({ percentage: 0 });
    setRounding('none');
    setSelectedPerson(null);
    setNewItemName('');
    setNewItemPrice('');
    setNewPersonName('');
  };

  // Item Management
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  const addItem = () => {
    if (newItemName.trim() && newItemPrice.trim()) {
      const newItem = {
        id: Date.now(),
        name: newItemName.trim(),
        price: parseFloat(newItemPrice)
      };
      setItems([...items, newItem]);
      setNewItemName('');
      setNewItemPrice('');
    }
  };

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
    // Remove assignments for deleted item
    const newAssignments = { ...assignments };
    delete newAssignments[id];
    setAssignments(newAssignments);
  };

  // People Management
  const [newPersonName, setNewPersonName] = useState('');

  const addPerson = () => {
    if (newPersonName.trim()) {
      const newPerson = {
        id: Date.now(),
        name: newPersonName.trim()
      };
      setPeople([...people, newPerson]);
      setNewPersonName('');
    }
  };

  const deletePerson = (id) => {
    setPeople(people.filter(person => person.id !== id));
    // Remove person from all assignments
    const newAssignments = { ...assignments };
    Object.keys(newAssignments).forEach(itemId => {
      newAssignments[itemId] = newAssignments[itemId].filter(personId => personId !== id);
    });
    setAssignments(newAssignments);
  };

  // Assignment Management
  const toggleAssignment = (itemId, personId) => {
    const currentAssignments = assignments[itemId] || [];
    const isAssigned = currentAssignments.includes(personId);
    
    if (isAssigned) {
      setAssignments({
        ...assignments,
        [itemId]: currentAssignments.filter(id => id !== personId)
      });
    } else {
      setAssignments({
        ...assignments,
        [itemId]: [...currentAssignments, personId]
      });
    }
  };

  // Calculation Functions
  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + item.price, 0);
  };

  const getTaxAmount = () => {
    const subtotal = getSubtotal();
    if (tax.type === 'dollar') {
      return tax.value;
    } else {
      return subtotal * (tax.value / 100);
    }
  };

  const getBaseTipAmount = () => {
    const subtotal = getSubtotal();
    return subtotal * (tip.percentage / 100);
  };

  const getTipAmount = () => {
    const baseTip = getBaseTipAmount();
    
    if (rounding === 'total') {
      const baseTotal = getBaseTotal();
      const roundedTotal = Math.ceil(baseTotal);
      const difference = roundedTotal - baseTotal;
      return baseTip + difference; // Add rounding difference to tip
    } else if (rounding === 'individual') {
      // Calculate total rounding difference from all individuals
      const totalRoundingDifference = people.reduce((sum, person) => {
        const personBaseTotal = getPersonBaseTotal(person.id);
        const roundedPersonTotal = Math.ceil(personBaseTotal);
        return sum + (roundedPersonTotal - personBaseTotal);
      }, 0);
      return baseTip + totalRoundingDifference;
    } else {
      return baseTip;
    }
  };

  const getEffectiveTipPercentage = () => {
    const subtotal = getSubtotal();
    if (subtotal === 0) return 0;
    return (getTipAmount() / subtotal) * 100;
  };

  const getBaseTotal = () => {
    return getSubtotal() + getTaxAmount() + getBaseTipAmount();
  };

  const getTotal = () => {
    const baseTotal = getBaseTotal();
    
    if (rounding === 'total') {
      return Math.ceil(baseTotal);
    } else if (rounding === 'individual') {
      // Sum of all individual rounded totals
      return people.reduce((sum, person) => {
        const personBaseTotal = getPersonBaseTotal(person.id);
        return sum + Math.ceil(personBaseTotal);
      }, 0);
    } else {
      return baseTotal;
    }
  };

  const getPersonBaseTotal = (personId) => {
    let personSubtotal = 0;
    
    // Calculate person's meal cost
    items.forEach(item => {
      const assignedPeople = assignments[item.id] || [];
      if (assignedPeople.includes(personId)) {
        personSubtotal += item.price / assignedPeople.length;
      }
    });

    // Calculate proportional tax and tip (base amounts)
    const totalSubtotal = getSubtotal();
    const proportion = totalSubtotal > 0 ? personSubtotal / totalSubtotal : 0;
    
    const personTax = getTaxAmount() * proportion;
    const personBaseTip = getBaseTipAmount() * proportion;
    
    return personSubtotal + personTax + personBaseTip;
  };

  const getPersonTotal = (personId) => {
    let personSubtotal = 0;
    
    // Calculate person's meal cost
    items.forEach(item => {
      const assignedPeople = assignments[item.id] || [];
      if (assignedPeople.includes(personId)) {
        personSubtotal += item.price / assignedPeople.length;
      }
    });

    // Calculate proportional tax and tip
    const totalSubtotal = getSubtotal();
    const proportion = totalSubtotal > 0 ? personSubtotal / totalSubtotal : 0;
    
    const personTax = getTaxAmount() * proportion;
    let personTip = getBaseTipAmount() * proportion;

    // Apply rounding logic
    if (rounding === 'individual') {
      // Round each person up individually, add difference to their tip
      const personBaseTotal = personSubtotal + personTax + personTip;
      const roundedTotal = Math.ceil(personBaseTotal);
      const difference = roundedTotal - personBaseTotal;
      personTip += difference; // Add rounding difference to tip
      
      return {
        subtotal: personSubtotal,
        tax: personTax,
        tip: personTip,
        total: roundedTotal
      };
    } else if (rounding === 'total') {
      // Distribute the rounded total difference proportionally to tips
      const baseTotal = getBaseTotal();
      const roundedTotal = Math.ceil(baseTotal);
      const difference = roundedTotal - baseTotal;
      
      // Add proportional share of the rounding difference to tip
      const personBaseTotal = personSubtotal + personTax + personTip;
      const adjustmentRatio = baseTotal > 0 ? personBaseTotal / baseTotal : 0;
      const personTipAdjustment = difference * adjustmentRatio;
      
      return {
        subtotal: personSubtotal,
        tax: personTax,
        tip: personTip + personTipAdjustment,
        total: personBaseTotal + personTipAdjustment
      };
    } else {
      // No rounding
      return {
        subtotal: personSubtotal,
        tax: personTax,
        tip: personTip,
        total: personSubtotal + personTax + personTip
      };
    }
  };

  const getPersonItems = (personId) => {
    return items.filter(item => {
      const assignedPeople = assignments[item.id] || [];
      return assignedPeople.includes(personId);
    }).map(item => ({
      ...item,
      splitCost: item.price / (assignments[item.id]?.length || 1)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            Bill Splitter Calculator
          </h1>
          <button
            onClick={resetAll}
            className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition-colors font-medium"
          >
            Reset All
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Card 1: Bill Items */}
          <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Bill Items</h2>
            
            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
              <input
                type="number"
                placeholder="Price ($)"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
              <button
                onClick={addItem}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-green-600 ml-2">${item.price.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-red-500 hover:text-red-700 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: People */}
          <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">People</h2>
            
            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Person's name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addPerson()}
              />
              <button
                onClick={addPerson}
                className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
              >
                Add Person
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {people.map(person => (
                <div key={person.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2">
                  <span>{person.name}</span>
                  <button
                    onClick={() => deletePerson(person.id)}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Who Ordered What? */}
          <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Who Ordered What?</h2>
            
            <div className="space-y-4">
              {items.map(item => {
                const assignedPeople = assignments[item.id] || [];
                const splitCount = assignedPeople.length;
                const costPerPerson = splitCount > 0 ? item.price / splitCount : item.price;
                
                return (
                  <div key={item.id} className="border border-gray-200 rounded-md p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-green-600">${item.price.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {people.map(person => (
                        <button
                          key={person.id}
                          onClick={() => toggleAssignment(item.id, person.id)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            assignedPeople.includes(person.id)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {person.name}
                        </button>
                      ))}
                    </div>
                    
                    {splitCount > 0 && (
                      <div className="text-sm text-gray-600">
                        Split {splitCount} way{splitCount > 1 ? 's' : ''}: ${costPerPerson.toFixed(2)} each
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 4: Tax & Tip */}
          <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Tax & Tip</h2>
            
            <div className="space-y-4">
              {/* Tax */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax</label>
                <div className="flex gap-2">
                  <select
                    value={tax.type}
                    onChange={(e) => setTax({ ...tax, type: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">%</option>
                    <option value="dollar">$</option>
                  </select>
                  <input
                    type="number"
                    value={tax.value}
                    onChange={(e) => setTax({ ...tax, value: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={tax.type === 'percentage' ? 'Enter %' : 'Enter $'}
                  />
                </div>
              </div>

              {/* Tip */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tip (%)</label>
                <input
                  type="number"
                  value={tip.percentage}
                  onChange={(e) => setTip({ percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tip percentage"
                />
              </div>

              {/* Rounding */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rounding</label>
                <select
                  value={rounding}
                  onChange={(e) => setRounding(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No rounding</option>
                  <option value="total">Round total bill up</option>
                  <option value="individual">Round each person up</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 5: Settlement Summary */}
          <div className="bg-white rounded-lg shadow-md p-6 h-fit lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Settlement Summary</h2>
            
            {/* Total Summary */}
            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${getTaxAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tip:</span>
                  <div className="text-right">
                    <div>${getTipAmount().toFixed(2)}</div>
                    {rounding !== 'none' && getEffectiveTipPercentage() !== tip.percentage && (
                      <div className="text-xs text-gray-600">
                        ({getEffectiveTipPercentage().toFixed(1)}% effective)
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>${getTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Individual Totals */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Individual Totals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {people.map(person => {
                  const personCosts = getPersonTotal(person.id);
                  return (
                    <button
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      className="bg-blue-50 p-3 rounded-md hover:bg-blue-100 transition-colors w-full text-left"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{person.name}</span>
                        <span className="text-blue-600 font-semibold">
                          ${personCosts.total.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Person Detail Modal */}
        {selectedPerson && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">{selectedPerson.name}'s Bill</h3>
                  <button
                    onClick={() => setSelectedPerson(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Items Ordered */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Items Ordered</h4>
                    <div className="space-y-2">
                      {getPersonItems(selectedPerson.id).map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.name}</span>
                          <span>${item.splitCost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Cost Breakdown */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-800 mb-2">Cost Breakdown</h4>
                    <div className="space-y-1 text-sm">
                      {(() => {
                        const costs = getPersonTotal(selectedPerson.id);
                        return (
                          <>
                            <div className="flex justify-between">
                              <span>Meal Cost:</span>
                              <span>${costs.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tax:</span>
                              <span>${costs.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tip:</span>
                              <span>${costs.tip.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-lg border-t pt-2">
                              <span>Total:</span>
                              <span>${costs.total.toFixed(2)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;