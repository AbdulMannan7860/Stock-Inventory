import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { confirmAlert } from 'react-confirm-alert';
import Modal from 'react-modal';
import toast from 'react-hot-toast';
import InventoryContext from '../../context/InventoryContext/inventoryContext';

Modal.setAppElement('#root');

const Inventory = () => {
    const context = useContext(InventoryContext);
    const { inventoryData, updateInventory, deleteInventory } = context;

    const [inventory, setInventory] = useState([]);
    const [displayedInventory, setDisplayedInventory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showLowStock, setShowLowStock] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
    const [lowStockItems, setLowStockItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [quantity, setQuantity] = useState(0);
    const itemsPerPage = 10;

    useEffect(() => {
        setInventory(inventoryData);
        setDisplayedInventory(inventoryData);
        checkLowStockLevels(inventoryData);
    }, [inventoryData]);

    const checkLowStockLevels = (inventoryData) => {
        const lowStockItems = inventoryData.filter(item => item.quantity <= item.lowStockThreshold);
        setLowStockItems(lowStockItems);
        lowStockItems.forEach(item => {
            toast(`Warning: Item ${item.name} is low on stock!`, {
                icon: '⚠️',
            });
        });
    };

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
        setCurrentPage(1);
    };

    useEffect(() => {
        const filteredInventory = inventory.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
        let sortedInventory = filteredInventory;
        if (sortConfig.key) {
            sortedInventory = [...filteredInventory].sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        if (showLowStock) {
            setDisplayedInventory(sortedInventory.filter(item => item.quantity <= item.lowStockThreshold));
        } else {
            setDisplayedInventory(sortedInventory);
        }
    }, [searchTerm, inventory, showLowStock, sortConfig]);

    const toggleLowStock = () => {
        setShowLowStock(!showLowStock);
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(displayedInventory.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = displayedInventory.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const totalQuantity = inventory.reduce((total, item) => total + item.quantity, 0);

    const pieDataFunction = () => {

        let data = [];
        let pieData
        let uniqueCategories = [...new Set(inventory.map(item => item.category))];

        if (uniqueCategories.length === 0) {
            pieData = {
                labels: ['No Data'],
                datasets: [{
                    data: [0],
                    backgroundColor: ['#FFCE56'],
                }]
            }
        }
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FFCD56', '#C9CBCF', '#FF5733', '#33FF57',
            '#3357FF', '#FF33A1', '#A1FF33', '#33FFF6', '#FF9133',
            '#9133FF', '#33FF91', '#9133FF', '#33A1FF', '#F633FF'
        ];

        let color;

        uniqueCategories && uniqueCategories.forEach(uniqueCategory => {
            const count = inventory.filter(item => item.category === uniqueCategory).length;
            color = uniqueCategories.indexOf(uniqueCategory)
            data.push({
                data: count,
                backgroundColor: colors[color],
            });
        })
        pieData = {
            labels: uniqueCategories,
            datasets: [{ data: data.map(item => item.data), backgroundColor: data.map(item => item.backgroundColor) }]
        }
        return pieData
    }


    const pieData = pieDataFunction();

    const handleDelete = (itemId) => {
        confirmAlert({
            customUI: ({ onClose }) => (
                <div className="fixed top-0 right-0 bottom-0 left-0 flex justify-center items-center bg-gray-500 bg-opacity-75">
                    <div className="bg-secondary text-white rounded-lg shadow-md p-4 w-64">
                        <h5 className="text-lg font-bold mb-2">Confirm Delete</h5>
                        <p className="text-sm mb-4">Are you sure you want to delete this Item?</p>
                        <button
                            className="bg-red-700 hover:bg-accent-red text-white font-bold py-2 px-4 rounded"
                            onClick={() => {
                                deleteInventory(itemId);
                                onClose();
                            }}
                        >
                            Yes
                        </button>
                        <button
                            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded ml-2"
                            onClick={onClose}
                        >
                            No
                        </button>
                    </div>
                </div>
            ),
        });
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const reorderItem = async (itemId) => {
        const find = inventory.find(item => parseInt(item._id) === parseInt(itemId));
        const newQuantity = parseInt(find.quantity) + parseInt(quantity);
        await updateInventory(itemId, newQuantity);
        setQuantity(0);
    };

    const openModal = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className='w-full p-4 bg-white rounded-lg shadow-lg'>
            <div className='mb-4'>
                <h1 className='text-3xl font-semibold text-center text-primary-dark'>Inventory</h1>
            </div>
            <div className='flex items-center justify-between mx-auto p-4 bg-gray-100 rounded-lg shadow-md'>
                <input
                    type='text'
                    placeholder='Search inventory...'
                    className='text-sm text-secondary-dark bg-white p-2 rounded-lg placeholder-secondary-dark'
                    value={searchTerm}
                    onChange={handleSearch}
                />
                <Link to='/inv/new' className='text-sm text-white bg-secondary p-2 rounded-lg'>Add New Item</Link>
            </div>
            <div className='flex justify-between py-1 px-8 w-full mt-4'>
                <p className='text-sm text-secondary-dark'>Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, displayedInventory.length)} of {displayedInventory.length} entries</p>
                <p className='text-sm text-secondary-dark'>Page {currentPage} of {totalPages}</p>
            </div>
            <div className='flex justify-between'>
                <table className='border w-8/12 bg-white shadow-lg rounded-lg'>
                    <thead className='bg-secondary-dark text-white'>
                        <tr>
                            <th className='p-2 cursor-pointer' onClick={() => handleSort('name')}>
                                Name <span>{sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</span>
                            </th>
                            <th className='p-2 cursor-pointer' onClick={() => handleSort('category')}>
                                Category <span>{sortConfig.key === 'category' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</span>
                            </th>
                            <th className='p-2 cursor-pointer' onClick={() => handleSort('quantity')}>
                                Quantity <span>{sortConfig.key === 'quantity' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</span>
                            </th>
                            <th className='p-2 cursor-pointer' onClick={() => handleSort('price')}>
                                Price <span>{sortConfig.key === 'price' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</span>
                            </th>
                            <th className='p-2'>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map(item => (
                            <tr key={item._id} className={`border-b border-secondary-light hover:bg-gray-100 ${item.quantity <= item.lowStockThreshold ? 'bg-yellow-100' : ''}`}>
                                <td className='text-center p-2'>{item.name}</td>
                                <td className='text-center p-2'>{item.category}</td>
                                <td className={`text-center p-2 ${item.quantity <= item.lowStockThreshold ? 'text-accent-red font-bold' : ''}`}>{item.quantity}</td>
                                <td className='text-center p-2'>${item.price}</td>
                                <td className='text-center p-2'>
                                    <Link to={`/inv/edit/${item._id}`} className='text-accent-green hover:text-accent-darkgreen mx-2'>Edit</Link>
                                    <Link to={`/inv/view/${item._id}`} className='text-accent-green hover:text-accent-darkgreen mx-2'>View</Link>
                                    <button onClick={() => handleDelete(item._id)} className='text-accent-red hover:text-accent-darkred mx-2'>Delete</button>
                                    {item.quantity <= item.lowStockThreshold && (
                                        <button onClick={() => openModal()} className='text-accent-blue hover:text-accent-darkblue mx-2'>Reorder</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className='w-4/12'>
                    <div className='bg-white rounded-lg shadow-md p-4 border ml-2'>
                        <h2 className='text-lg font-semibold mb-2'>Inventory Stats</h2>
                        <div className='text-base text-secondary-dark'>
                            <p>Total Quantity: {totalQuantity}</p>
                            <p>Low Stock Items: {lowStockItems.length}</p>
                        </div>
                    </div>
                    <div className='bg-white rounded-lg shadow-md p-12 border ml-2 mt-4'>
                        <h2 className='text-lg font-semibold mb-2'>Category Distribution</h2>
                        <Pie data={pieData} />
                    </div>
                    <div className='bg-white rounded-lg shadow-md p-4 mt-4 border ml-2'>
                        <button className={`w-full py-2 rounded-lg ${showLowStock ? 'bg-accent-red text-white' : 'bg-secondary text-white'}`} onClick={toggleLowStock}>
                            {showLowStock ? 'Show All Stock' : 'Show Low Stock'}
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex justify-center mt-4">
                <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="text-sm px-4 py-2 mx-1 rounded text-white bg-secondary disabled:opacity-50"
                >
                    Previous
                </button>
                {[...Array(totalPages).keys()].map((number) => (
                    <button
                        key={number + 1}
                        onClick={() => paginate(number + 1)}
                        className={`text-sm px-4 py-2 mx-1 rounded ${currentPage === number + 1 ? 'bg-primary-dark text-white' : 'bg-secondary text-white'}`}
                    >
                        {number + 1}
                    </button>
                ))}
                <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="text-sm px-4 py-2 mx-1 rounded text-white bg-secondary disabled:opacity-50"
                >
                    Next
                </button>
            </div>

            <Modal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                contentLabel="Reorder Modal"
                className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-gray-500 bg-opacity-75"
            >
                <div className="bg-white rounded-lg shadow-lg p-4 w-1/3">
                    <h2 className="text-lg font-semibold mb-2">Reorder Items</h2>
                    {lowStockItems.map(item => (
                        <div key={item.id} className="mb-4">
                            <p>{item.name} (Current Quantity: {item.quantity})</p>
                            <input
                                type="number"
                                min="1"
                                className="w-full p-2 border rounded"
                                placeholder="Enter reorder quantity"
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                            <button
                                className="bg-secondary text-white p-2 rounded mt-2 w-full"
                                onClick={() => {
                                    reorderItem(item._id);
                                }}
                            >
                                Reorder
                            </button>
                        </div>
                    ))}
                    <button
                        className="bg-gray-500 text-white p-2 rounded mt-4 w-full"
                        onClick={closeModal}
                    >
                        Close
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Inventory;
