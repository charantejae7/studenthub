import { useEffect, useState } from "react"

function ExamCountdown({ exam }) {

  // -----------------------------------------
  // CALCULATE REMAINING TIME
  // -----------------------------------------
  const calculateTimeLeft = () => {

    if (!exam) {
      return null
    }


    const examDateTime = new Date(
      `${exam.exam_date}T${exam.exam_time}`
    ).getTime()


    const now = new Date().getTime()

    const difference = examDateTime - now


    if (difference <= 0) {

      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        expired: true,
      }

    }


    return {

      days: Math.floor(
        difference /
        (1000 * 60 * 60 * 24)
      ),

      hours: Math.floor(
        (difference /
          (1000 * 60 * 60)) %
          24
      ),

      minutes: Math.floor(
        (difference /
          (1000 * 60)) %
          60
      ),

      seconds: Math.floor(
        (difference / 1000) % 60
      ),

      expired: false,

    }

  }


  // -----------------------------------------
  // COUNTDOWN STATE
  // -----------------------------------------
  const [timeLeft, setTimeLeft] =
    useState(calculateTimeLeft())


  // -----------------------------------------
  // START LIVE TIMER
  // -----------------------------------------
  useEffect(() => {

    setTimeLeft(calculateTimeLeft())


    if (!exam) {
      return
    }


    const timer = setInterval(() => {

      setTimeLeft(calculateTimeLeft())

    }, 1000)


    return () => {
      clearInterval(timer)
    }

  }, [exam])


  // -----------------------------------------
  // FORMAT NUMBER
  // -----------------------------------------
  const format = (number) => {

    return String(number)
      .padStart(2, "0")

  }


  // -----------------------------------------
  // NO EXAM
  // -----------------------------------------
  if (!exam) {

    return (
      <section className="mx-auto max-w-5xl px-6 pb-24">

        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-8 text-center">

          <div className="text-4xl">
            🗓️
          </div>

          <h2 className="mt-4 text-2xl font-bold">
            No upcoming exam
          </h2>

          <p className="mt-2 text-zinc-500">
            Add an exam to start your countdown.
          </p>

        </div>

      </section>
    )

  }


  // -----------------------------------------
  // COUNTDOWN UI
  // -----------------------------------------
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">

      <div className="relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-7 sm:p-10">

        {/* Glow */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />


        <div className="relative">

          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
                Next Exam
              </p>

              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                {exam.subject}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                {exam.exam_date}
                {" • "}
                {exam.exam_time.slice(0, 5)}
              </p>

            </div>


            {!timeLeft?.expired && (
              <span className="w-fit rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-300">
                ⏳ Live countdown
              </span>
            )}

          </div>


          {/* Countdown */}
          {timeLeft?.expired ? (

            <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">

              <div className="text-4xl">
                🚨
              </div>

              <h3 className="mt-3 text-2xl font-bold">
                Exam time!
              </h3>

              <p className="mt-2 text-zinc-500">
                The countdown has ended.
              </p>

            </div>

          ) : (

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">

              <div className="rounded-2xl border border-zinc-800 bg-zinc-800/60 p-5 text-center">

                <div className="text-4xl font-black tabular-nums sm:text-5xl">
                  {format(timeLeft.days)}
                </div>

                <div className="mt-2 text-xs uppercase tracking-wider text-zinc-500">
                  Days
                </div>

              </div>


              <div className="rounded-2xl border border-zinc-800 bg-zinc-800/60 p-5 text-center">

                <div className="text-4xl font-black tabular-nums sm:text-5xl">
                  {format(timeLeft.hours)}
                </div>

                <div className="mt-2 text-xs uppercase tracking-wider text-zinc-500">
                  Hours
                </div>

              </div>


              <div className="rounded-2xl border border-zinc-800 bg-zinc-800/60 p-5 text-center">

                <div className="text-4xl font-black tabular-nums sm:text-5xl">
                  {format(timeLeft.minutes)}
                </div>

                <div className="mt-2 text-xs uppercase tracking-wider text-zinc-500">
                  Minutes
                </div>

              </div>


              <div className="rounded-2xl border border-zinc-800 bg-zinc-800/60 p-5 text-center">

                <div className="text-4xl font-black tabular-nums sm:text-5xl">
                  {format(timeLeft.seconds)}
                </div>

                <div className="mt-2 text-xs uppercase tracking-wider text-zinc-500">
                  Seconds
                </div>

              </div>

            </div>

          )}

        </div>

      </div>

    </section>
  )
}

export default ExamCountdown