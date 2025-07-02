import React from 'react';

const DetailList = ({ items = [] }) => {
  return (
    <div className="flow-root rounded-lg border border-gray-200 py-3 shadow-sm">
      <dl className="-my-3 divide-y divide-gray-200 text-sm">
        {items.map((item, index) => (
          <div
            key={index}
            className={`grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4 ${item.fullWidth ? 'sm:grid-cols-1' : ''}`}
          >
            <dt className="font-medium text-gray-900">{item.label}</dt>
            <dd className="text-gray-700 sm:col-span-2">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default DetailList;