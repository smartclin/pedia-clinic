'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'


export function Modal({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        Open Modal
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsOpen(false)}>
          <div className="bg-opacity-50 fixed inset-0 bg-black" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <Dialog.Title className="text-lg font-semibold">
                {title}
              </Dialog.Title>
              <div className="mt-2">{children}</div>
              <button
                onClick={() => setIsOpen(false)}
                className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700">
                Close
              </button>
            </DialogPanel>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
