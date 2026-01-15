import SkeletonComponent from '@/components/SkeletonComponent';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Spinner2 } from '@/components/ui/spinner2';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppDispatch, useAppSelector } from '@/store';
import { handleAddWordToQueue, handlePauseQueue, handleQueueView, handleResumeQueue } from '@/store/word/wordQueueSlide';
import { ArrowRight, MoveLeft } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import RecentWord from '../components/RecentWord';



const WordQueue = () => {
    const [hydrating, setHydrating] = useState(true);
    const { t } = useTranslation();
   
    const {
        data, error, status, pauseOrResumeStatus, addWordStatus
    } = useAppSelector((state) => state.word.wordQueue.wordQueue);
    const dispatch = useAppDispatch();
    useEffect(() => {
        dispatch(handleQueueView());
    }, [dispatch]);

    useEffect(() => {
        const id = setTimeout(() => setHydrating(false), 50); // 10–120ms
        return () => clearTimeout(id);
    }, []);
    if (hydrating || status === 'loading') {
        return <SkeletonComponent/>;
    }
    return (
        <div className='space-y-4'>
            <div className='mb-2'>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem >
                            <BreadcrumbPage>{t("appMenu.words")}</BreadcrumbPage>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />

                        <BreadcrumbItem>
                            <BreadcrumbPage>{t("appMenu.wordQueue")}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className='bg-background w-full border rounded-md flex justify-between items-center px-2 py-2'>
                 
                <h1 className='text-xl font-semibold'>Word Queue Manager</h1>
                <div className='flex items-center gap-4'>
                    <div>
                        {
                            <div className='flex flex-nowrap gap-1 items-center p-1'>
                                <div
                            className={`${data?.enabled ? 'bg-green-500' : 'bg-red-500'} h-4 w-4 rounded-full`}

                            >
                                
                            </div>
                            <span className={`${data?.enabled ? 'text-green-600' : 'text-red-600'}`}>{data?.enabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            
                        }
                    </div>

                    <Button
                    disabled={pauseOrResumeStatus === 'loading'}
                        className={
                            `${data?.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white h-6`
                        }
                        onClick={(e) => {
                            e.preventDefault();
                            if (data?.enabled) {
                                // Pause the queue
                                dispatch(handlePauseQueue());
                            } else {
                                // Resume the queue
                                dispatch(handleResumeQueue());
                            }
                        }}
                    >
                        {pauseOrResumeStatus === 'loading' ? (
                            <Spinner2 className='h-4 w-4 text-white'/>
                        ) : null}
                        {data?.enabled ? 'Disable' : 'Enable'}
                    </Button>
                </div>
                
            </div>
            <div className='grid md:grid-cols-3 grid-cols-1 gap-2 '>
                <div className='col-span-2 flex flex-col gap-4 h-max'>
                    <div className='border bg-background rounded-md p-4 items-center flex gap-4 flex-nowrap'>
                        <h1>Add Word to Queue</h1>
                        <Input 
                        id='add-word-to-queue'
                        className='flex-1'
                        placeholder='Enter a word to add to the queue'
                        disabled={addWordStatus === 'loading'}

                        ></Input>
                        <Button
                        disabled={addWordStatus === 'loading'}
                        size={"sm"}
                        variant={"default"}
                        onClick={async (e) => {
                            e.preventDefault();
                            const input = document.getElementById('add-word-to-queue') as HTMLInputElement;
                            const wordKey = input.value.trim();
                            if (wordKey.length > 0) {
                                await dispatch(handleAddWordToQueue(wordKey));
                                input.value = '';
                            }
                        }}
                        >
                            {addWordStatus === 'loading' ? <Spinner2 className='h-4 w-4 text-white'/> : null}
                            Add to Queue
                        </Button>
                    </div>
                    {/* 2 ss: queue processing, queue remaining */}
                    <div className='border rounded-md bg-background'>
                        <h2 className='p-4 font-semibold'>Dang xu ly: <span className='text-amber-500'>{data?.processing.length}</span></h2>
                        <hr />
                        <div className='p-4'>
                            {data &&  data.processing.length <=0 ? <div>
                               <div className='p-4 text-gray-400'>
                                <h1>No words are being processed currently.</h1>
                               </div>
                            </div> :  data?.processing.map((item, index) => (
                                <div key={index} className='flex p-2 border-b last:border-0 justify-between'>
                                    <h4>{item}</h4>
                                    <Spinner2 className='text-primary'/>
                                </div>
                            ))}
                        </div>
                        
                    </div>
                    <div className='border rounded-md bg-background'>
                        <h2 className='p-4 font-semibold'>Con lai trong queue: <span className='text-blue-500'>{data?.queued.length}</span></h2>
                        <hr />
                        <div className='flex flex-nowrap overflow-x-auto gap-2 p-4'>
                            {
                            data && data.queued.length <= 0 ? <div>
                                <div>
                                    <div className='p-4 text-gray-400'>
                                        <h1>The word queue is currently empty.</h1>
                                    </div>
                                </div>
                            </div> : data?.queued.map((item, index) => (
                                <div  key={index} className='flex gap-2 flex-nowrap'>
                                <div className='p-2 w-max border rounded-md'>
                                    {item}
                                </div>
                                {
                                index < data.queued.length - 1 && (
                                    <MoveLeft size={16} className='self-center text-gray-400' />
                                )
                                }
                                </div>
                            ))
                        }
                        
                        </div>
                        
                    </div>
                </div>
                <div className='border rounded-md bg-background'>
                    <h2 className='font-semibold p-4'>Recent Words</h2>
                    <hr className='mb-2'/>
                    <div className='h-[38vh] overflow-y-auto'>
                        {
                        data && data.recentlyAddedWords.length <= 0 ? <div>
                            <div className='p-4 text-gray-400'>
                                <h1>No recent words have been added to the queue.</h1>
                            </div>
                        </div> : data?.recentlyAddedWords.map((item, index) => (
                            <RecentWord key={index} word={item} />
                        ))
                        }
                    </div>
                </div>

            </div>
        </div>
    )
}

export default WordQueue